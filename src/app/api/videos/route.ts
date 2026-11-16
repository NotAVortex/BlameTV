import { db, insensitive } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { handleError, ok } from "@/lib/api";

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
