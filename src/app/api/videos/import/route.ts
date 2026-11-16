import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { videoMetaSchema } from "@/lib/validation";
import { parseEmbedUrl } from "@/lib/embed";
import { rateLimit } from "@/lib/rate-limit";
import { fail, handleError, ok } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const rl = rateLimit(`import:${user.id}`, 30, 60 * 60 * 1000);
    if (!rl.ok) return fail("Import limit reached. Try later.", 429);

    const body = await req.json();
    const meta = videoMetaSchema.parse({
      title: body.title,
      description: body.description ?? "",
      category: body.category ?? "Other",
      tags: body.tags ?? "",
      visibility: body.visibility ?? "PUBLIC",
    });

    const embed = parseEmbedUrl(String(body.url ?? ""));
    if (!embed) {
      return fail(
        "Unsupported or invalid link. Allowed: YouTube, Vimeo, Dailymotion, Twitch, Streamable",
        422
      );
    }

    const created = await db.video.create({
      data: {
        ...meta,
        embedUrl: embed.embedUrl,
        thumbnailUrl: embed.thumbnailUrl,
        source: embed.provider,
        ownerId: user.id,
      },
      select: { id: true },
    });

    return ok({ id: created.id }, 201);
  } catch (err) {
    return handleError(err);
  }
}
