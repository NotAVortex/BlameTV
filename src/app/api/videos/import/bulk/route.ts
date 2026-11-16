import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { videoMetaSchema } from "@/lib/validation";
import { fetchEmbedMeta, parseEmbedUrl, PROVIDER_LABELS } from "@/lib/embed";
import { rateLimit } from "@/lib/rate-limit";
import { fail, handleError, ok } from "@/lib/api";

const MAX_BULK = 50;

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const rl = rateLimit(`importbulk:${user.id}`, 12, 60 * 60 * 1000);
    if (!rl.ok) return fail("Bulk import limit reached. Try later.", 429);

    const body = await req.json();
    const urls: unknown = body?.urls;
    if (!Array.isArray(urls) || urls.length === 0 || urls.length > MAX_BULK) {
      return fail(`Provide 1 to ${MAX_BULK} video links`, 422);
    }

    const created: string[] = [];
    const skipped: number[] = [];

    const importOne = async (rawUrl: string, index: number) => {
      const embed = parseEmbedUrl(rawUrl);
      if (!embed) {
        skipped.push(index);
        return;
      }
      const fetched = await fetchEmbedMeta(embed.provider, rawUrl);
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
          ownerId: user.id,
        },
        select: { id: true },
      });
      created.push(row.id);
    };

    const BATCH = 4;
    for (let start = 0; start < urls.length; start += BATCH) {
      const batch = urls.slice(start, start + BATCH).map((raw, i) => importOne(String(raw ?? ""), start + i));
      await Promise.allSettled(batch);
    }

    return ok({ created: created.length, ids: created, skipped: skipped.length }, 201);
  } catch (err) {
    return handleError(err);
  }
}
