export type PlatformComment = {
  id: string;
  author: string;
  avatar: string | null;
  time: string | null;
  text: string;
  likes: string | null;
};

export function youtubeIdFromEmbedUrl(embedUrl: string): string | null {
  const m = /\/embed\/([A-Za-z0-9_-]{6,20})/.exec(embedUrl);
  return m ? m[1] : null;
}

type Unknown = Record<string, unknown>;

const INNERTUBE_URL =
  "https://www.youtube.com/youtubei/v1/next?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
const INNERTUBE_CONTEXT = {
  context: {
    client: { clientName: "WEB", clientVersion: "2.20240401.00.00", hl: "en", gl: "US" },
  },
};
const INNERTUBE_HEADERS = {
  "content-type": "application/json",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  "accept-language": "en-US,en;q=0.9",
  origin: "https://www.youtube.com",
  referer: "https://www.youtube.com/",
};

function collectComments(node: unknown, out: Map<string, PlatformComment>, depth: number) {
  if (!node || depth > 40) return;
  if (Array.isArray(node)) {
    for (const item of node) collectComments(item, out, depth + 1);
    return;
  }
  if (typeof node !== "object") return;
  const obj = node as Unknown;

  const entity = obj.commentEntityPayload as Unknown | undefined;
  if (entity && typeof entity === "object") {
    const e = entity as Unknown;
    const props = e.properties as Unknown | undefined;
    const author = e.author as Unknown | undefined;
    const toolbar = e.toolbar as Unknown | undefined;
    const content = props?.content as Unknown | undefined;
    const id = typeof props?.commentId === "string" ? props.commentId : null;
    const text = typeof content?.content === "string" ? content.content : "";
    if (id && text.trim() && !out.has(id)) {
      let avatar: string | null =
        typeof author?.avatarThumbnailUrl === "string" ? author.avatarThumbnailUrl : null;
      if (avatar && avatar.startsWith("//")) avatar = `https:${avatar}`;
      out.set(id, {
        id,
        text,
        author: typeof author?.displayName === "string" ? author.displayName : "Unknown",
        avatar,
        time: typeof props?.publishedTime === "string" ? props.publishedTime : null,
        likes:
          typeof toolbar?.likeCountNotliked === "string"
            ? toolbar.likeCountNotliked
            : typeof toolbar?.likeCountLiked === "string"
              ? toolbar.likeCountLiked
              : null,
      });
    }
  }

  const legacy = obj.commentRenderer as Unknown | undefined;
  if (legacy && typeof legacy === "object") {
    const c = legacy as Unknown;
    const id = typeof c.commentId === "string" ? c.commentId : null;
    const authorText = c.authorText as Unknown | undefined;
    const contentText = c.contentText as Unknown | undefined;
    const runs = Array.isArray(contentText?.runs) ? contentText.runs : [];
    const text = runs
      .map((r) => (typeof (r as Unknown)?.text === "string" ? (r as Unknown).text : ""))
      .join("");
    if (id && text.trim() && !out.has(id)) {
      const thumb = c.authorThumbnail as Unknown | undefined;
      out.set(id, {
        id,
        text,
        author: typeof authorText?.simpleText === "string" ? authorText.simpleText : "Unknown",
        avatar: thumb && typeof thumb.url === "string" ? (thumb.url as string) : null,
        time:
          typeof (c.publishedTimeText as Unknown)?.simpleText === "string"
            ? ((c.publishedTimeText as Unknown).simpleText as string)
            : null,
        likes:
          typeof (c.voteCount as Unknown)?.simpleText === "string"
            ? ((c.voteCount as Unknown).simpleText as string)
            : null,
      });
    }
  }

  for (const value of Object.values(obj)) collectComments(value, out, depth + 1);
}

function findCommentsToken(node: unknown, depth: number): string | null {
  if (!node || depth > 40) return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const t = findCommentsToken(item, depth + 1);
      if (t) return t;
    }
    return null;
  }
  if (typeof node !== "object") return null;
  const obj = node as Unknown;

  if (obj.targetId === "engagement-panel-comments-section") {
    const m = /"token":"([^"]+)"/.exec(JSON.stringify(obj));
    if (m) return m[1];
  }
  const section = obj.itemSectionRenderer as Unknown | undefined;
  if (
    section &&
    typeof section === "object" &&
    section.sectionIdentifier === "comment-item-section"
  ) {
    const m = /"token":"([^"]+)"/.exec(JSON.stringify(section));
    if (m) return m[1];
  }

  for (const value of Object.values(obj)) {
    const t = findCommentsToken(value, depth + 1);
    if (t) return t;
  }
  return null;
}

async function innertubeNext(body: object): Promise<Unknown | null> {
  try {
    const res = await fetch(INNERTUBE_URL, {
      method: "POST",
      headers: INNERTUBE_HEADERS,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return (await res.json()) as Unknown;
  } catch {
    return null;
  }
}

export async function fetchYoutubeComments(
  videoId: string,
  cap = 50,
): Promise<PlatformComment[]> {
  const first = await innertubeNext({ ...INNERTUBE_CONTEXT, videoId });
  if (!first) return [];

  const out = new Map<string, PlatformComment>();
  collectComments(first, out, 0);

  let token = findCommentsToken(first, 0);
  let pages = 0;
  while (token && out.size < cap && pages < 3) {
    const next = await innertubeNext({ ...INNERTUBE_CONTEXT, continuation: token });
    if (!next) break;
    collectComments(next, out, 0);
    const s = JSON.stringify(next);
    const tokens: string[] = [];
    for (const m of s.matchAll(/"token":"(Eg0SC[^"]{20,})"/g)) tokens.push(m[1]);
    token = tokens.length ? tokens[tokens.length - 1] : null;
    pages += 1;
  }

  return Array.from(out.values()).slice(0, cap);
}

export type YoutubeChannelMeta = {
  name: string | null;
  url: string | null;
  avatar: string | null;
};

export async function fetchYoutubeChannelMeta(
  videoId: string,
): Promise<YoutubeChannelMeta> {
  let html: string;
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en&gl=US`, {
      signal: AbortSignal.timeout(8000),
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "accept-language": "en-US,en;q=0.9",
        cookie: "CONSENT=YES+cb",
      },
    });
    if (!res.ok) return { name: null, url: null, avatar: null };
    html = await res.text();
  } catch {
    return { name: null, url: null, avatar: null };
  }

  const match = /ytInitialData\s*=\s*(\{[\s\S]+?\});\s*<\/script>/.exec(html);
  if (!match) return { name: null, url: null, avatar: null };
  let data: Unknown;
  try {
    data = JSON.parse(match[1]) as Unknown;
  } catch {
    return { name: null, url: null, avatar: null };
  }

  const result: YoutubeChannelMeta = { name: null, url: null, avatar: null };

  const walk = (node: unknown, depth: number) => {
    if (!node || depth > 30 || result.name) return;
    if (Array.isArray(node)) {
      for (const item of node) walk(item, depth + 1);
      return;
    }
    if (typeof node !== "object") return;
    const obj = node as Unknown;

    const owner =
      (obj.videoOwnerRenderer as Unknown | undefined) ??
      (obj.owner as Unknown | undefined);
    if (owner && typeof owner === "object") {
      const o = owner as Unknown;
      const title = o.title as Unknown | undefined;
      const runs = Array.isArray(title?.runs) ? title.runs : [];
      for (const r of runs) {
        const t = (r as Unknown)?.text;
        if (typeof t === "string" && t.trim()) {
          result.name = t.trim().slice(0, 100);
          break;
        }
      }
      const thumbs = Array.isArray((o.thumbnail as Unknown)?.thumbnails)
        ? ((o.thumbnail as Unknown).thumbnails as Unknown[])
        : [];
      const last = thumbs.length ? thumbs[thumbs.length - 1] : null;
      if (last && typeof (last as Unknown).url === "string") {
        let avatarUrl = (last as Unknown).url as string;
        if (avatarUrl.startsWith("//")) avatarUrl = `https:${avatarUrl}`;
        result.avatar = avatarUrl;
      }
      const browse = (o.navigationEndpoint as Unknown)?.browseEndpoint as
        | Unknown
        | undefined;
      const base =
        typeof browse?.canonicalBaseUrl === "string" ? browse.canonicalBaseUrl : null;
      if (base) result.url = `https://www.youtube.com${base}`;
    }

    if (!result.name) {
      for (const value of Object.values(obj)) walk(value, depth + 1);
    }
  };

  walk(data, 0);
  if (result.name && !result.url) {
    result.url = `https://www.youtube.com/results?search_query=${encodeURIComponent(result.name)}`;
  }
  return result;
}

export async function detectYoutubeShort(videoId: string): Promise<boolean> {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en&gl=US`, {
      redirect: "manual",
      signal: AbortSignal.timeout(6000),
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "accept-language": "en-US,en;q=0.9",
        cookie: "CONSENT=YES+cb",
      },
    });
    if (res.status !== 301 && res.status !== 302 && res.status !== 303) return false;
    const location = res.headers.get("location") ?? "";
    return location.includes("/shorts/");
  } catch {
    return false;
  }
}
