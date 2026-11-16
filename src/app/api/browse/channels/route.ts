import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { fail, handleError, ok } from "@/lib/api";

export type BrowseChannel = {
  id: string;
  name: string;
  query: string;
  avatar: string | null;
  platform: string;
};

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const rl = rateLimit(`browsechannels:${user.id}`, 20, 60 * 60 * 1000);
    if (!rl.ok) return fail("Too many searches. Try later.", 429);

    const url = new URL(req.url);
    const platform = url.searchParams.get("platform") ?? "youtube";
    const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
    if (!q) return fail("Search text required", 422);

    if (platform === "youtube") {
      return ok({ channels: await searchYoutubeChannels(q) });
    }
    if (platform === "dailymotion") {
      return ok({ channels: await searchDailymotionChannels(q) });
    }
    if (platform === "blametv") {
      const users = await db.user.findMany({
        where: {
          OR: [{ username: { contains: q } }, { displayName: { contains: q } }],
        },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      });
      return ok({
        channels: users.map((u) => ({
          id: u.id,
          name: u.displayName,
          query: u.username,
          avatar: u.avatarUrl,
          platform: "blametv",
        })),
      });
    }
    return fail("Unsupported platform. Supported: youtube, dailymotion, blametv", 422);
  } catch (err) {
    return handleError(err);
  }
}

async function searchYoutubeChannels(q: string): Promise<BrowseChannel[]> {
  const searchUrl = new URL("https://www.youtube.com/results");
  searchUrl.searchParams.set("search_query", q);
  searchUrl.searchParams.set("sp", "EgIQAg==");
  searchUrl.searchParams.set("hl", "en");
  searchUrl.searchParams.set("gl", "US");

  let html: string;
  try {
    const res = await fetch(searchUrl.toString(), {
      signal: AbortSignal.timeout(10000),
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "accept-language": "en-US,en;q=0.9",
        cookie: "CONSENT=YES+cb",
      },
    });
    if (!res.ok) return [];
    html = await res.text();
  } catch {
    return [];
  }

  const match = /ytInitialData\s*=\s*(\{[\s\S]+?\});\s*<\/script>/.exec(html);
  if (!match) return [];
  let data: unknown;
  try {
    data = JSON.parse(match[1]);
  } catch {
    return [];
  }

  const renderers: Record<string, unknown>[] = [];
  collect(data, renderers);

  function collect(node: unknown, out: Record<string, unknown>[]) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const item of node) collect(item, out);
      return;
    }
    const obj = node as Record<string, unknown>;
    if (obj.channelRenderer && typeof obj.channelRenderer === "object") {
      out.push(obj.channelRenderer as Record<string, unknown>);
    }
    for (const value of Object.values(obj)) collect(value, out);
  }

  const seen = new Set<string>();
  const channels: BrowseChannel[] = [];
  for (const r of renderers) {
    const channelId = typeof r.channelId === "string" ? r.channelId : null;
    if (!channelId || seen.has(channelId)) continue;
    seen.add(channelId);
    channels.push({
      id: channelId,
      name: extractText(r.title),
      query: `https://www.youtube.com/channel/${channelId}`,
      avatar: extractAvatar(r),
      platform: "youtube",
    });
    if (channels.length >= 10) break;
  }
  return channels;
}

function extractText(node: unknown): string {
  if (!node || typeof node !== "object") return "Unknown channel";
  const obj = node as Record<string, unknown>;
  if (typeof obj.simpleText === "string" && obj.simpleText.trim()) return obj.simpleText.trim();
  const runs = obj.runs;
  if (Array.isArray(runs) && runs.length > 0) {
    const text = (runs[0] as Record<string, unknown>)?.text;
    if (typeof text === "string" && text.trim()) return text.trim();
  }
  return "Unknown channel";
}

function extractAvatar(r: Record<string, unknown>): string | null {
  const candidates = [r.thumbnail, r.avatar, r.thumbnailRenderer];
  for (const c of candidates) {
    if (!c || typeof c !== "object") continue;
    const obj = c as Record<string, unknown>;
    const thumbs = (obj.thumbnails ?? obj.thumbnail ?? obj.sources) as unknown;
    if (Array.isArray(thumbs) && thumbs.length > 0) {
      const last = thumbs[thumbs.length - 1] as Record<string, unknown>;
      if (typeof last?.url === "string") return last.url.startsWith("//") ? `https:${last.url}` : last.url;
    }
    const inner = (obj as Record<string, unknown>).thumbnail as unknown;
    if (inner && typeof inner === "object") return extractAvatar({ thumbnail: inner });
  }
  return null;
}

async function searchDailymotionChannels(q: string): Promise<BrowseChannel[]> {
  try {
    const res = await fetch(
      `https://api.dailymotion.com/users?search=${encodeURIComponent(q)}&fields=id,username,screenname,avatar_120_url&limit=10`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      list?: { id?: string; username?: string; screenname?: string; avatar_120_url?: string }[];
    };
    return (data.list ?? [])
      .filter((c) => typeof c.username === "string")
      .map((c) => ({
        id: c.id ?? c.username!,
        name: c.screenname ?? c.username!,
        query: c.username!,
        avatar: c.avatar_120_url ?? null,
        platform: "dailymotion",
      }));
  } catch {
    return [];
  }
}
