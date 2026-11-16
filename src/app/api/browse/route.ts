import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { fail, handleError, ok } from "@/lib/api";
import { fetchYoutubeChannelMeta } from "@/lib/youtube-comments";

export type BrowseVideo = { url: string; title: string; thumbnail: string | null };
export type BrowseChannelMeta = { name: string | null; url: string | null; avatar: string | null };

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const rl = rateLimit(`browse:${user.id}`, 60, 60 * 60 * 1000);
    if (!rl.ok) return fail("Too many channel lookups. Try later.", 429);

    const url = new URL(req.url);
    const platform = url.searchParams.get("platform") ?? "youtube";
    const resolve = url.searchParams.get("resolve");
    if (resolve === "video") {
      const target = (url.searchParams.get("url") ?? "").trim().slice(0, 300);
      const videoId = youtubeVideoId(target);
      if (!videoId) return fail("Paste a YouTube video link", 422);
      const meta = await fetchYoutubeChannelMeta(videoId);
      if (!meta.name && !meta.url) {
        return fail("Could not find the channel behind that video", 404);
      }
      return ok({ channel: meta });
    }
    const playlist = url.searchParams.get("playlist");
    if (playlist) {
      const videos = await browseYoutubePlaylist(playlist.trim().slice(0, 300));
      return ok({ videos });
    }
    const channel = (url.searchParams.get("channel") ?? "").trim().slice(0, 200);
    if (!channel) return fail("Channel required", 422);

    if (platform === "youtube") {
      const result = await browseYoutube(channel);
      return ok(result);
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

function youtubeVideoId(input: string): string | null {
  if (/^[A-Za-z0-9_-]{11}$/.test(input)) return input;
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return null;
  }
  if (!/(^|\.)(youtube\.com|youtu\.be)$/.test(parsed.hostname)) return null;
  if (parsed.hostname.endsWith("youtu.be")) {
    const id = parsed.pathname.slice(1).split("/")[0];
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  }
  const v = parsed.searchParams.get("v");
  return v && /^[A-Za-z0-9_-]{11}$/.test(v) ? v : null;
}

async function browseYoutube(
  channel: string
): Promise<{ videos: BrowseVideo[]; channel: BrowseChannelMeta | null }> {
  let fetchUrl: string;
  if (/^https?:\/\//i.test(channel)) {
    let parsed: URL;
    try {
      parsed = new URL(channel);
    } catch {
      return { videos: [], channel: null };
    }
    if (!/(^|\.)youtube\.com$/.test(parsed.hostname)) return { videos: [], channel: null };
    const base = parsed.pathname.replace(/\/(videos|featured|shorts|streams|playlists|community|about).*$/, "");
    fetchUrl = `https://www.youtube.com${base}/videos?hl=en&gl=US`;
  } else {
    const handle = channel.replace(/^@/, "");
    if (!/^[A-Za-z0-9._-]{3,40}$/.test(handle)) return { videos: [], channel: null };
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
    if (!res.ok) return { videos: [], channel: null };
    html = await res.text();
  } catch {
    return { videos: [], channel: null };
  }

  const match = /ytInitialData\s*=\s*(\{[\s\S]+?\});\s*<\/script>/.exec(html);
  if (!match) return { videos: [], channel: null };
  let data: unknown;
  try {
    data = JSON.parse(match[1]);
  } catch {
    return { videos: [], channel: null };
  }

  type Item = { kind: "legacy" | "lockup"; value: Record<string, unknown> };
  const items: Item[] = [];
  collect(data, items);

  function collect(node: unknown, out: Item[]) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const item of node) collect(item, out);
      return;
    }
    const obj = node as Record<string, unknown>;
    if (obj.videoRenderer && typeof obj.videoRenderer === "object") {
      out.push({ kind: "legacy", value: obj.videoRenderer as Record<string, unknown> });
    }
    if (obj.lockupViewModel && typeof obj.lockupViewModel === "object") {
      out.push({ kind: "lockup", value: obj.lockupViewModel as Record<string, unknown> });
    }
    for (const value of Object.values(obj)) collect(value, out);
  }

  const seen = new Set<string>();
  const videos: BrowseVideo[] = [];
  for (const item of items) {
    let videoId: string | null = null;
    let title = "Untitled";
    if (item.kind === "legacy") {
      videoId = typeof item.value.videoId === "string" ? item.value.videoId : null;
      if (videoId) title = extractTitle(item.value.title);
    } else {
      videoId = typeof item.value.contentId === "string" ? item.value.contentId : null;
      if (videoId && item.value.contentType && item.value.contentType !== "LOCKUP_CONTENT_TYPE_VIDEO") {
        videoId = null;
      }
      if (videoId) {
        const metadata = item.value.metadata as Record<string, unknown> | undefined;
        const lockupMeta = metadata?.lockupMetadataViewModel as Record<string, unknown> | undefined;
        const titleNode = lockupMeta?.title as Record<string, unknown> | undefined;
        if (titleNode && typeof titleNode.content === "string") title = titleNode.content.slice(0, 140);
      }
    }
    if (!videoId || seen.has(videoId)) continue;
    seen.add(videoId);
    videos.push({
      url: `https://www.youtube.com/watch?v=${videoId}`,
      title,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
    });
    if (videos.length >= 250) break;
  }
  return { videos, channel: findChannelMeta(data) };
}

function findChannelMeta(node: unknown): BrowseChannelMeta | null {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findChannelMeta(item);
      if (found) return found;
    }
    return null;
  }
  const obj = node as Record<string, unknown>;
  const meta = obj.channelMetadataRenderer;
  if (meta && typeof meta === "object") {
    const m = meta as Record<string, unknown>;
    let avatar: string | null = null;
    const thumbs = (m.avatar as Record<string, unknown> | undefined)?.thumbnails;
    if (Array.isArray(thumbs) && thumbs.length > 0) {
      const last = thumbs[thumbs.length - 1] as Record<string, unknown>;
      if (typeof last?.url === "string") {
        avatar = last.url.startsWith("//") ? `https:${last.url}` : last.url;
      }
    }
    return {
      name: typeof m.title === "string" ? m.title : null,
      url:
        typeof m.channelUrl === "string"
          ? m.channelUrl
          : typeof m.vanityChannelUrl === "string"
            ? m.vanityChannelUrl
            : null,
      avatar,
    };
  }
  for (const value of Object.values(obj)) {
    const found = findChannelMeta(value);
    if (found) return found;
  }
  return null;
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

async function browseYoutubePlaylist(input: string): Promise<BrowseVideo[]> {
  let listId: string | null = null;
  if (/^https?:\/\//i.test(input)) {
    try {
      const parsed = new URL(input);
      if (/(^|\.)youtube\.com$/.test(parsed.hostname)) {
        listId = /[?&]list=([A-Za-z0-9_-]{12,60})/.exec(parsed.search)?.[1] ?? null;
      }
    } catch {
      listId = null;
    }
  } else {
    const raw = input.trim();
    if (/^[A-Za-z0-9_-]{12,60}$/.test(raw)) listId = raw;
  }
  if (!listId) return [];

  let html: string;
  try {
    const res = await fetch(`https://www.youtube.com/playlist?list=${listId}&hl=en&gl=US`, {
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

  type Item = { kind: "legacy" | "lockup"; value: Record<string, unknown> };
  const items: Item[] = [];
  collect(data, items);

  function collect(node: unknown, out: Item[]) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const item of node) collect(item, out);
      return;
    }
    const obj = node as Record<string, unknown>;
    if (obj.playlistVideoRenderer && typeof obj.playlistVideoRenderer === "object") {
      out.push({ kind: "legacy", value: obj.playlistVideoRenderer as Record<string, unknown> });
    }
    if (obj.lockupViewModel && typeof obj.lockupViewModel === "object") {
      out.push({ kind: "lockup", value: obj.lockupViewModel as Record<string, unknown> });
    }
    for (const value of Object.values(obj)) collect(value, out);
  }

  const seen = new Set<string>();
  const videos: BrowseVideo[] = [];
  for (const item of items) {
    let videoId: string | null = null;
    let title = "Untitled";
    if (item.kind === "legacy") {
      videoId = typeof item.value.videoId === "string" ? item.value.videoId : null;
      if (videoId) title = extractTitle(item.value.title);
    } else {
      videoId = typeof item.value.contentId === "string" ? item.value.contentId : null;
      if (videoId && item.value.contentType && item.value.contentType !== "LOCKUP_CONTENT_TYPE_VIDEO") {
        videoId = null;
      }
      if (videoId) {
        const metadata = item.value.metadata as Record<string, unknown> | undefined;
        const lockupMeta = metadata?.lockupMetadataViewModel as Record<string, unknown> | undefined;
        const titleNode = lockupMeta?.title as Record<string, unknown> | undefined;
        if (titleNode && typeof titleNode.content === "string") title = titleNode.content.slice(0, 140);
      }
    }
    if (!videoId || seen.has(videoId)) continue;
    seen.add(videoId);
    videos.push({
      url: `https://www.youtube.com/watch?v=${videoId}`,
      title,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
    });
    if (videos.length >= 250) break;
  }
  return videos;
}

async function browseDailymotion(username: string): Promise<BrowseVideo[]> {
  const handle = username.replace(/^@/, "").replace(/^https?:\/\/(www\.)?dailymotion\.com\//, "").split("/")[0];
  if (!/^[A-Za-z0-9._-]{3,40}$/.test(handle)) return [];
  try {
    const res = await fetch(
      `https://api.dailymotion.com/user/${encodeURIComponent(handle)}/videos?fields=id,title,thumbnail_480_url&limit=100&sort=recent`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      list?: { id?: string; title?: string; thumbnail_480_url?: string }[];
    };
    return (data.list ?? [])
      .filter((v) => typeof v.id === "string")
      .slice(0, 250)
      .map((v) => ({
        url: `https://www.dailymotion.com/video/${v.id}`,
        title: (v.title ?? "Untitled").slice(0, 140),
        thumbnail: v.thumbnail_480_url ?? null,
      }));
  } catch {
    return [];
  }
}
