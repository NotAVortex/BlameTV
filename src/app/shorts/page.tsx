import Link from "next/link";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import ShortsFeed from "@/components/ShortsFeed";
import { shuffle } from "@/lib/recommend";

export const dynamic = "force-dynamic";

export default async function ShortsPage() {
  const viewer = await getSessionUser();

  const pool = await db.video.findMany({
    where: { isShort: true, visibility: "PUBLIC" },
    select: {
      id: true,
      title: true,
      embedUrl: true,
      views: true,
      sourceChannel: true,
      sourceChannelUrl: true,
      owner: { select: { username: true, displayName: true, avatarUrl: true } },
    },
  });

  shuffle(pool);
  const shorts = pool.slice(0, 60);

  const ids = shorts.map((v) => v.id);
  const [voteRows, myVotes] = viewer && ids.length > 0
    ? await Promise.all([
        db.videoLike.groupBy({
          by: ["videoId", "value"],
          where: { videoId: { in: ids } },
          _count: { _all: true },
        }),
        db.videoLike.findMany({
          where: { userId: viewer.id, videoId: { in: ids } },
          select: { videoId: true, value: true },
        }),
      ])
    : [[], []];
  const likesByVideo = new Map<string, number>();
  const dislikesByVideo = new Map<string, number>();
  for (const row of voteRows) {
    if (row.value === 1) likesByVideo.set(row.videoId, row._count._all);
    if (row.value === -1) dislikesByVideo.set(row.videoId, row._count._all);
  }
  const myByVideo = new Map(myVotes.map((r) => [r.videoId, r.value]));

  const feed = shorts.map((v) => ({
    ...v,
    likes: likesByVideo.get(v.id) ?? 0,
    dislikes: dislikesByVideo.get(v.id) ?? 0,
    myLike: myByVideo.get(v.id) ?? 0,
  }));

  if (pool.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <h1 className="mb-1 text-xl font-bold sm:text-2xl">Shorts</h1>
        <p className="mb-6 text-sm text-[#aaaaaa]">
          Vertical videos imported from YouTube. Scroll or swipe to the next one — when you reach
          the end, the feed reshuffles and keeps going forever.
        </p>
        <div className="card p-8 text-center">
          <p className="text-sm text-[#aaaaaa]">
            No shorts yet. Repost a vertical video from YouTube (or use the shorts scan) and it
            appears here automatically.
          </p>
          <Link href="/upload" className="btn-primary mt-4 inline-block">
            Repost videos
          </Link>
        </div>
      </div>
    );
  }

  return <ShortsFeed initial={feed} loggedIn={!!viewer} />;
}
