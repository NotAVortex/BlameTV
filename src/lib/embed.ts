const ALLOWED_EMBED_HOSTS = new Set([
  "www.youtube.com",
  "youtube.com",
  "youtu.be",
  "www.youtube-nocookie.com",
  "player.vimeo.com",
  "vimeo.com",
  "www.dailymotion.com",
  "dailymotion.com",
  "www.twitch.tv",
  "twitch.tv",
  "streamable.com",
]);

export type ParsedEmbed = {
  embedUrl: string;
  thumbnailUrl: string | null;
  provider: string;
};

export function parseEmbedUrl(raw: string): ParsedEmbed | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (!ALLOWED_EMBED_HOSTS.has(url.hostname)) return null;

  const host = url.hostname.replace(/^(www\.)?/, "");
  const path = url.pathname;

  if (host === "youtu.be") {
    const id = path.slice(1).split("/")[0];
    if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) return null;
    return {
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
      thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      provider: "YOUTUBE",
    };
  }

  if (host === "youtube.com") {
    if (path === "/watch") {
      const id = url.searchParams.get("v");
      if (!id || !/^[A-Za-z0-9_-]{6,20}$/.test(id)) return null;
      return {
        embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
        thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        provider: "YOUTUBE",
      };
    }
    const shorts = /^\/(shorts|embed|live)\/([A-Za-z0-9_-]{6,20})/.exec(path);
    if (shorts) {
      return {
        embedUrl: `https://www.youtube-nocookie.com/embed/${shorts[2]}`,
        thumbnailUrl: `https://i.ytimg.com/vi/${shorts[2]}/hqdefault.jpg`,
        provider: "YOUTUBE",
      };
    }
    return null;
  }

  if (host === "vimeo.com") {
    const id = /^\/(\d{6,12})/.exec(path);
    if (id) {
      return {
        embedUrl: `https://player.vimeo.com/video/${id[1]}`,
        thumbnailUrl: null,
        provider: "VIMEO",
      };
    }
    return null;
  }

  if (host === "dailymotion.com") {
    const id = /^\/video\/([A-Za-z0-9]{5,12})/.exec(path);
    if (id) {
      return {
        embedUrl: `https://www.dailymotion.com/embed/video/${id[1]}`,
        thumbnailUrl: `https://www.dailymotion.com/thumbnail/video/${id[1]}`,
        provider: "DAILYMOTION",
      };
    }
    return null;
  }

  if (host === "twitch.tv") {
    const vod = /^\/videos\/(\d+)/.exec(path);
    const channel = path.slice(1).split("/")[0];
    if (vod) {
      return {
        embedUrl: `https://player.twitch.tv/?video=${vod[1]}&parent=localhost`,
        thumbnailUrl: null,
        provider: "TWITCH",
      };
    }
    if (channel && /^[A-Za-z0-9_]{3,25}$/.test(channel)) {
      return {
        embedUrl: `https://player.twitch.tv/?channel=${channel}&parent=localhost`,
        thumbnailUrl: null,
        provider: "TWITCH",
      };
    }
    return null;
  }

  if (host === "streamable.com") {
    const id = /^\/([A-Za-z0-9]{4,12})/.exec(path);
    if (id) {
      return {
        embedUrl: `https://streamable.com/e/${id[1]}`,
        thumbnailUrl: null,
        provider: "STREAMABLE",
      };
    }
    return null;
  }

  return null;
}

const OEMBED_BY_PROVIDER: Record<string, (url: string) => string> = {
  YOUTUBE: (url) => `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
  VIMEO: (url) => `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`,
  DAILYMOTION: (url) => `https://www.dailymotion.com/services/oembed?url=${encodeURIComponent(url)}`,
  STREAMABLE: (url) => `https://api.streamable.com/oembed.json?url=${encodeURIComponent(url)}`,
};

export const PROVIDER_LABELS: Record<string, string> = {
  YOUTUBE: "YouTube",
  VIMEO: "Vimeo",
  DAILYMOTION: "Dailymotion",
  TWITCH: "Twitch",
  STREAMABLE: "Streamable",
};

export async function fetchEmbedMeta(
  provider: string,
  originalUrl: string
): Promise<{ title: string; author: string | null } | null> {
  const make = OEMBED_BY_PROVIDER[provider];
  if (!make) return null;
  try {
    const res = await fetch(make(originalUrl), {
      signal: AbortSignal.timeout(6000),
      headers: { "user-agent": "BlameTV/1.0 (+https://blametv.vercel.app)" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: unknown; author_name?: unknown };
    if (typeof data.title !== "string" || !data.title.trim()) return null;
    return {
      title: data.title.trim().slice(0, 140),
      author: typeof data.author_name === "string" && data.author_name.trim()
        ? data.author_name.trim().slice(0, 50)
        : null,
    };
  } catch {
    return null;
  }
}

export function originalWatchUrl(embedUrl: string): string | null {
  try {
    const u = new URL(embedUrl);
    if (u.hostname.endsWith("youtube-nocookie.com") || u.hostname.endsWith("youtube.com")) {
      const id = u.pathname.split("/").pop();
      return id ? `https://www.youtube.com/watch?v=${id}` : null;
    }
    if (u.hostname.endsWith("vimeo.com")) {
      const id = u.pathname.split("/").pop();
      return id ? `https://vimeo.com/${id}` : null;
    }
    if (u.hostname.endsWith("dailymotion.com")) {
      const id = u.pathname.replace(/^\/(embed\/video\/|embed\/)/, "").split("/")[0];
      return id ? `https://www.dailymotion.com/video/${id}` : null;
    }
    if (u.hostname.endsWith("twitch.tv")) {
      return `https://www.twitch.tv/${u.pathname.replace(/^\/embed\//, "")}`;
    }
    if (u.hostname.endsWith("streamable.com")) {
      const id = u.pathname.replace(/^\/e\//, "").split("/")[0];
      return id ? `https://streamable.com/${id}` : null;
    }
    return null;
  } catch {
    return null;
  }
}
