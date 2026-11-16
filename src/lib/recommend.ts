import { db } from "@/lib/db";

export type ScoredVideo = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  durationSec: number;
  views: number;
  createdAt: Date;
  score?: number;
  reason?: string;
  owner: { username: string; displayName: string; avatarUrl: string | null };
};

const CANDIDATE_POOL = 400;

function tagSet(tags: string): Set<string> {
  return new Set(
    tags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
  );
}

function trendingScore(views: number, createdAt: Date): number {
  const ageHours = Math.max(1, (Date.now() - createdAt.getTime()) / 3_600_000);
  return views / Math.pow(ageHours + 2, 1.4);
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function randomPublicIds(pool: number, extraWhere: Record<string, unknown> = {}): Promise<string[]> {
  const rows = await db.video.findMany({
    where: { visibility: "PUBLIC", ...extraWhere },
    select: { id: true },
    take: 1000,
  });
  return shuffle(rows.map((r) => r.id)).slice(0, pool);
}

export async function randomPublicIdsInCategory(category: string, take: number): Promise<string[]> {
  return randomPublicIds(take, { category });
}

export async function getTrending(limit = 24): Promise<ScoredVideo[]> {
  const ids = await randomPublicIds(CANDIDATE_POOL);
  const candidates = await db.video.findMany({
    where: { visibility: "PUBLIC", id: { in: ids } },
    select: {
      id: true,
      title: true,
      thumbnailUrl: true,
      durationSec: true,
      views: true,
      createdAt: true,
      tags: true,
      category: true,
      owner: { select: { username: true, displayName: true, avatarUrl: true } },
      sourceChannel: true,
      sourceChannelUrl: true,
      sourceChannelAvatar: true,
    },
  });

  return shuffle(
    candidates.map((v) => ({ ...v, score: trendingScore(v.views, v.createdAt), reason: "Trending" }))
  ).slice(0, limit);
}

export async function getRelatedVideos(
  videoId: string,
  limit = 12
): Promise<ScoredVideo[]> {
  const current = await db.video.findUnique({
    where: { id: videoId },
    select: { id: true, category: true, tags: true, ownerId: true },
  });
  if (!current) return [];

  const ids = await randomPublicIds(CANDIDATE_POOL, { id: { not: videoId } });
  const candidates = await db.video.findMany({
    where: { visibility: "PUBLIC", id: { in: ids } },
    select: {
      id: true,
      title: true,
      thumbnailUrl: true,
      durationSec: true,
      views: true,
      createdAt: true,
      tags: true,
      category: true,
      ownerId: true,
      owner: { select: { username: true, displayName: true, avatarUrl: true } },
      sourceChannel: true,
      sourceChannelUrl: true,
      sourceChannelAvatar: true,
    },
  });

  const currentTags = tagSet(current.tags);

  const scored = candidates.map((v) => {
    const vTags = tagSet(v.tags);
    let overlap = 0;
    for (const t of vTags) if (currentTags.has(t)) overlap += 1;

    const score =
      overlap * 3 +
      (v.category === current.category ? 2 : 0) +
      (v.ownerId === current.ownerId ? 1.5 : 0) +
      (trendingScore(v.views, v.createdAt) / 50) * (0.75 + Math.random() * 0.5);

    const reason =
      overlap > 0
        ? "Similar tags"
        : v.category === current.category
          ? "Same category"
          : v.ownerId === current.ownerId
            ? "Same channel"
            : "Popular";

    return { ...v, score, reason };
  });

  return shuffle(scored).slice(0, limit);
}

export async function getPersonalFeed(
  userId: string | null,
  limit = 48
): Promise<ScoredVideo[]> {
  if (!userId) {
    const trending = await getTrending(limit);
    return trending.map((v) => ({ ...v, reason: "Trending now" }));
  }

  const [history, likedVideos, subscriptions] = await Promise.all([
    db.watchHistory.findMany({
      where: { userId },
      orderBy: { watchedAt: "desc" },
      take: 30,
      select: { videoId: true, video: { select: { category: true, tags: true } } },
    }),
    db.videoLike.findMany({
      where: { userId, value: 1 },
      take: 50,
      select: { videoId: true, video: { select: { category: true, tags: true } } },
    }),
    db.subscription.findMany({
      where: { subscriberId: userId },
      select: { channelId: true },
    }),
  ]);

  const watchedIds = new Set(history.map((h) => h.videoId));
  const likedIds = new Set(likedVideos.map((l) => l.videoId));
  const subChannelIds = new Set(subscriptions.map((s) => s.channelId));

  const affinityTags = new Map<string, number>();
  const affinityCategories = new Map<string, number>();

  for (const item of [...history.map((h) => h.video), ...likedVideos.map((l) => l.video)]) {
    for (const t of tagSet(item.tags)) {
      affinityTags.set(t, (affinityTags.get(t) ?? 0) + 1);
    }
    affinityCategories.set(item.category, (affinityCategories.get(item.category) ?? 0) + 1);
  }

  const ids = await randomPublicIds(CANDIDATE_POOL);
  const candidates = await db.video.findMany({
    where: { visibility: "PUBLIC", id: { in: ids } },
    select: {
      id: true,
      title: true,
      thumbnailUrl: true,
      durationSec: true,
      views: true,
      createdAt: true,
      tags: true,
      category: true,
      ownerId: true,
      owner: { select: { username: true, displayName: true, avatarUrl: true } },
      sourceChannel: true,
      sourceChannelUrl: true,
      sourceChannelAvatar: true,
    },
  });

  const maxTags = Math.max(1, ...affinityTags.values());

  const scored = candidates.map((v) => {
    let score = (trendingScore(v.views, v.createdAt) / 30) * (0.75 + Math.random() * 0.5);

    for (const t of tagSet(v.tags)) {
      score += ((affinityTags.get(t) ?? 0) / maxTags) * 4;
    }
    score += (affinityCategories.get(v.category) ?? 0) * 0.5;

    if (subChannelIds.has(v.ownerId)) score += 6;
    if (watchedIds.has(v.id)) score -= 8;
    if (likedIds.has(v.id)) score -= 8;

    const reason = subChannelIds.has(v.ownerId)
      ? "From your subscriptions"
      : (affinityCategories.get(v.category) ?? 0) > 0
        ? `Because you watch ${v.category}`
        : "Trending now";

    return { ...v, score, reason };
  });

  return shuffle(scored).slice(0, limit);
}

export async function getRandomFeed(limit = 12): Promise<ScoredVideo[]> {
  const ids = await randomPublicIds(limit);
  const videos = await db.video.findMany({
    where: { visibility: "PUBLIC", id: { in: ids } },
    select: {
      id: true,
      title: true,
      thumbnailUrl: true,
      durationSec: true,
      views: true,
      createdAt: true,
      owner: { select: { username: true, displayName: true, avatarUrl: true } },
      sourceChannel: true,
      sourceChannelUrl: true,
      sourceChannelAvatar: true,
    },
  });
  return shuffle(videos);
}
