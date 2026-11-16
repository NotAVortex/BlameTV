import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { videoMetaSchema } from "@/lib/validation";
import { fetchEmbedMeta, parseEmbedUrl, PROVIDER_LABELS } from "@/lib/embed";
import { youtubeChannelKey } from "@/lib/youtube-comments";
import { rateLimit } from "@/lib/rate-limit";
import { fail, handleError, ok } from "@/lib/api";

const MAX_BULK = 250;

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const rl = rateLimit(`importbulk:${user.id}`, 60, 60 * 60 * 1000);
    if (!rl.ok) return fail("Bulk import limit reached. Try later.", 429);

    const body = await req.json();
    const urls: unknown = body?.urls;
    if (!Array.isArray(urls) || urls.length === 0 || urls.length > MAX_BULK) {
      return fail(`Provide 1 to ${MAX_BULK} video links`, 422);
    }
    const channelName =
      typeof body?.channelName === "string" && body.channelName.trim()
        ? body.channelName.trim().slice(0, 100)
        : null;
    const channelUrl =
      typeof body?.channelUrl === "string" && /^https:\/\//.test(body.channelUrl)
        ? body.channelUrl.slice(0, 300)
        : null;
    const channelAvatar =
      typeof body?.channelAvatar === "string" && /^https:\/\//.test(body.channelAvatar)
        ? body.channelAvatar.slice(0, 500)
        : null;
    const asShort = body?.asShort === true;

    const created: string[] = [];
    const skipped: number[] = [];
    let blocked = 0;
    let alreadyImported = 0;

    const importOne = async (rawUrl: string, index: number, asShort: boolean) => {
      const embed = parseEmbedUrl(rawUrl);
      if (!embed) {
        skipped.push(index);
        return;
      }
      const existing = await db.video.findFirst({
        where: { embedUrl: embed.embedUrl },
        select: { id: true },
      });
      if (existing) {
        alreadyImported += 1;
        return;
      }
      const isShort = asShort || /\/shorts\//.test(rawUrl);
      const fetched = await fetchEmbedMeta(embed.provider, rawUrl);
      const lockKeys = [
        youtubeChannelKey(fetched?.authorUrl),
        youtubeChannelKey(channelUrl),
      ].filter((k): k is string => Boolean(k));
      if (lockKeys.length > 0) {
        const lock = await db.lockedChannel.findFirst({
          where: { channelKey: { in: lockKeys }, ownerId: { not: user.id } },
          select: { id: true },
        });
        if (lock) {
          blocked += 1;
          return;
        }
      }
      const providerLabel = PROVIDER_LABELS[embed.provider] ?? embed.provider;
      const meta = videoMetaSchema.parse({
        title: fetched?.title ?? `Video from ${providerLabel}`,
        description: `Imported from ${providerLabel}${fetched?.author ? ` • ${fetched.author}` : ""}`,
        category: "Other",
        tags: "",
        visibility: "PUBLIC",
      });
      const row = await db.video.create({
        data: {
          ...meta,
          embedUrl: embed.embedUrl,
          thumbnailUrl: embed.thumbnailUrl,
          source: embed.provider,
          sourceChannel: fetched?.author ?? channelName,
          sourceChannelUrl: fetched?.authorUrl ?? channelUrl,
          sourceChannelAvatar: channelAvatar,
          isShort,
          ownerId: user.id,
        },
        select: { id: true },
      });
      created.push(row.id);
    };

    const BATCH = 4;
    for (let start = 0; start < urls.length; start += BATCH) {
      const batch = urls.slice(start, start + BATCH).map((raw, i) => importOne(String(raw ?? ""), start + i, asShort));
      await Promise.allSettled(batch);
    }

    return ok(
      {
        created: created.length,
        ids: created,
        skipped: skipped.length,
        blocked,
        alreadyImported,
      },
      201
    );
  } catch (err) {
    return handleError(err);
  }
}
