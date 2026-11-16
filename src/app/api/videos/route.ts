import { db, insensitive } from "@/lib/db";
import { getSessionUser, requireUser } from "@/lib/auth";
import { videoMetaSchema } from "@/lib/validation";
import { saveUpload, UploadError } from "@/lib/storage";
import { rateLimit } from "@/lib/rate-limit";
import { fail, handleError, ok } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim() ?? "";
    const category = url.searchParams.get("category")?.trim() ?? "";
    const sort = url.searchParams.get("sort") ?? "new";
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
    const pageSize = 24;

    const where = {
      visibility: "PUBLIC" as const,
      ...(q
        ? {
            OR: [
              { title: { contains: q, ...insensitive() } },
              { description: { contains: q, ...insensitive() } },
              { tags: { contains: q, ...insensitive() } },
            ],
          }
        : {}),
      ...(category ? { category } : {}),
    };

    const orderBy =
      sort === "views"
        ? { views: "desc" as const }
        : sort === "likes"
          ? { likes: { _count: "desc" as const } }
          : { createdAt: "desc" as const };

    const [videos, total] = await Promise.all([
      db.video.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          title: true,
          thumbnailUrl: true,
          durationSec: true,
          views: true,
          createdAt: true,
          category: true,
          owner: { select: { username: true, displayName: true, avatarUrl: true } },
          _count: { select: { likes: true } },
        },
      }),
      db.video.count({ where }),
    ]);

    return ok({ videos, total, page, pageSize });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const rl = rateLimit(`upload:${user.id}`, 20, 60 * 60 * 1000);
    if (!rl.ok) return fail("Upload limit reached. Try later.", 429);

    const form = await req.formData();
    const video = form.get("video");
    const thumbnail = form.get("thumbnail");
    if (!(video instanceof File)) return fail("Video file required");

    const meta = videoMetaSchema.parse({
      title: form.get("title"),
      description: form.get("description") ?? "",
      category: form.get("category") ?? "Other",
      tags: form.get("tags") ?? "",
      visibility: form.get("visibility") ?? "PUBLIC",
    });

    try {
      const videoUrl = await saveUpload(video, "video");
      const thumbnailUrl =
        thumbnail instanceof File && thumbnail.size > 0
          ? await saveUpload(thumbnail, "image")
          : null;

      const created = await db.video.create({
        data: { ...meta, videoUrl, thumbnailUrl, ownerId: user.id },
        select: { id: true },
      });
      return ok({ id: created.id }, 201);
    } catch (e) {
      if (e instanceof UploadError) return fail(e.message, 413);
      throw e;
    }
  } catch (err) {
    return handleError(err);
  }
}
