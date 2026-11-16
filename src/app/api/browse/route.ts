import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { fail, handleError, ok } from "@/lib/api";

export type BrowseVideo = { url: string; title: string; thumbnail: string | null };

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const rl = rateLimit(`browse:${user.id}`, 20, 60 * 60 * 1000);
    if (!rl.ok) return fail("Too many channel lookups. Try later.", 429);

    const url = new URL(req.url);
    const platform = url.searchParams.get("platform") ?? "youtube";
    const channel = (url.searchParams.get("channel") ?? "").trim().slice(0, 200);
    if (!channel) return fail("Channel required", 422);

    if (platform === "youtube") {
      const videos = await browseYoutube(channel);
      return ok({ videos });
    }
    if (platform === "dailymotion") {
      const videos = await browseDailymotion(channel);
      return ok({ videos });
    }
    return fail("Unsupported platform. Supported: youtube, dailymotion", 422);
  } catch (err) {
    return handleError(err);
  }
}

async function browseYoutube(channel: string): Promise<BrowseVideo[]> {
  let fetchUrl: string;
  if (/^https?:\/\//i.test(channel)) {
    let parsed: URL;
    try {
      parsed = new URL(channel);
    } catch {
      return [];
    }
    if (!/(^|\.)youtube\.com$/.test(parsed.hostname)) return [];
    const base = parsed.pathname.replace(/\/(videos|featured|shorts|streams|playlists|community|about).*$/, "");
    fetchUrl = `https://www.youtube.com${base}/videos?hl=en&gl=US`;
  } else {
    const handle = channel.replace(/^@/, "");
    if (!/^[A-Za-z0-9._-]{3,40}$/.test(handle)) return [];
    fetchUrl = `https://www.youtube.com/@${handle}/videos?hl=en&gl=US`;
  }

  let html: string;
  try {
    const res = await fetch(fetchUrl, {
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
    if (obj.videoRenderer && typeof obj.videoRenderer === "object") {
      out.push(obj.videoRenderer as Record<string, unknown>);
    }
    for (const value of Object.values(obj)) collect(value, out);
  }

  const seen = new Set<string>();
  const videos: BrowseVideo[] = [];
  for (const r of renderers) {
    const videoId = typeof r.videoId === "string" ? r.videoId : null;
    if (!videoId || seen.has(videoId)) continue;
    seen.add(videoId);
    const title = extractTitle(r.title);
    videos.push({
      url: `https://www.youtube.com/watch?v=${videoId}`,
      title,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
    });
    if (videos.length >= 24) break;
  }
  return videos;
}

function extractTitle(node: unknown): string {
  if (!node || typeof node !== "object") return "Untitled";
  const obj = node as Record<string, unknown>;
  const runs = obj.runs;
  if (Array.isArray(runs) && runs.length > 0) {
    const text = (runs[0] as Record<string, unknown>)?.text;
    if (typeof text === "string" && text.trim()) return text.trim().slice(0, 140);
  }
  if (typeof obj.simpleText === "string" && obj.simpleText.trim()) {
    return obj.simpleText.trim().slice(0, 140);
  }
  return "Untitled";
}

async function browseDailymotion(username: string): Promise<BrowseVideo[]> {
  const handle = username.replace(/^@/, "").replace(/^https?:\/\/(www\.)?dailymotion\.com\//, "").split("/")[0];
  if (!/^[A-Za-z0-9._-]{3,40}$/.test(handle)) return [];
  try {
    const res = await fetch(
      `https://api.dailymotion.com/user/${encodeURIComponent(handle)}/videos?fields=id,title,thumbnail_480_url&limit=25&sort=recent`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      list?: { id?: string; title?: string; thumbnail_480_url?: string }[];
    };
    return (data.list ?? [])
      .filter((v) => typeof v.id === "string")
      .slice(0, 24)
      .map((v) => ({
        url: `https://www.dailymotion.com/video/${v.id}`,
        title: (v.title ?? "Untitled").slice(0, 140),
        thumbnail: v.thumbnail_480_url ?? null,
      }));
  } catch {
    return [];
  }
}
