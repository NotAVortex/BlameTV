import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { videoMetaSchema } from "@/lib/validation";
import { fetchEmbedMeta, parseEmbedUrl, PROVIDER_LABELS } from "@/lib/embed";
import {
  detectYoutubeShort,
  fetchYoutubeChannelMeta,
  youtubeChannelKey,
  youtubeIdFromEmbedUrl,
} from "@/lib/youtube-comments";
import { rateLimit } from "@/lib/rate-limit";
import { fail, handleError, ok } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const rl = rateLimit(`import:${user.id}`, 60, 60 * 60 * 1000);
    if (!rl.ok) return fail("Import limit reached. Try later.", 429);

    const body = await req.json();
    const rawUrl = String(body.url ?? "");

    const embed = parseEmbedUrl(rawUrl);
    if (!embed) {
      return fail(
        "Unsupported or invalid link. Allowed: YouTube, Vimeo, Dailymotion, Twitch, Streamable, TikTok",
        422
      );
    }

    const dupe = await db.video.findFirst({
      where: { embedUrl: embed.embedUrl },
      select: { id: true },
    });
    if (dupe) {
      return fail("This video is already on BlameTV", 409);
    }

    const ytId =
      embed.provider === "YOUTUBE" ? youtubeIdFromEmbedUrl(embed.embedUrl) : null;
    const [fetched, channelMeta, isShort] = await Promise.all([
      fetchEmbedMeta(embed.provider, rawUrl),
      ytId ? fetchYoutubeChannelMeta(ytId) : Promise.resolve(null),
      ytId ? detectYoutubeShort(ytId) : Promise.resolve(false),
    ]);

    const lockKeys = [
      youtubeChannelKey(channelMeta?.url),
      youtubeChannelKey(fetched?.authorUrl),
    ].filter((k): k is string => Boolean(k));
    if (lockKeys.length > 0) {
      const lock = await db.lockedChannel.findFirst({
        where: { channelKey: { in: lockKeys }, ownerId: { not: user.id } },
        select: { id: true },
      });
      if (lock) {
        return fail(
          "This YouTube channel is locked by its owner. Only they can import videos from it.",
          403
        );
      }
    }
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
        sourceChannel: fetched?.author ?? channelMeta?.name,
        sourceChannelUrl: fetched?.authorUrl ?? channelMeta?.url,
        sourceChannelAvatar: channelMeta?.avatar,
        isShort,
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
