import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { videoMetaSchema } from "@/lib/validation";
import { fetchEmbedMeta, parseEmbedUrl, PROVIDER_LABELS } from "@/lib/embed";
import { rateLimit } from "@/lib/rate-limit";
import { fail, handleError, ok } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const rl = rateLimit(`import:${user.id}`, 30, 60 * 60 * 1000);
    if (!rl.ok) return fail("Import limit reached. Try later.", 429);

    const body = await req.json();
    const rawUrl = String(body.url ?? "");

    const embed = parseEmbedUrl(rawUrl);
    if (!embed) {
      return fail(
        "Unsupported or invalid link. Allowed: YouTube, Vimeo, Dailymotion, Twitch, Streamable",
        422
      );
    }

    const fetched = await fetchEmbedMeta(embed.provider, rawUrl);
    const providerLabel = PROVIDER_LABELS[embed.provider] ?? embed.provider;
    const title =
      fetched?.title ??
      (typeof body.title === "string" && body.title.trim()
        ? body.title.trim().slice(0, 140)
        : `Video from ${providerLabel}`);
    const description =
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim().slice(0, 5000)
        : `Imported from ${providerLabel}${fetched?.author ? ` • ${fetched.author}` : ""}`;

    const meta = videoMetaSchema.parse({
      title,
      description,
      category: body.category ?? "Other",
      tags: body.tags ?? "",
      visibility: body.visibility ?? "PUBLIC",
    });

    const created = await db.video.create({
      data: {
        ...meta,
        embedUrl: embed.embedUrl,
        thumbnailUrl: embed.thumbnailUrl ?? fetchedThumbnail(embed.provider, rawUrl),
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

function fetchedThumbnail(provider: string, rawUrl: string): string | null {
  if (provider !== "VIMEO") return null;
  const id = /vimeo\.com\/(\d{6,12})/.exec(rawUrl)?.[1];
  return id ? `https://vumbnail.com/${id}.jpg` : null;
}
