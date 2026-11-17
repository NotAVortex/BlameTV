import Link from "next/link";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import ShortsFeed from "@/components/ShortsFeed";

export const dynamic = "force-dynamic";

export default async function ShortsPage() {
  const viewer = await getSessionUser();

  const shorts = await db.video.findMany({
    where: { isShort: true, visibility: "PUBLIC" },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: {
      id: true,
      title: true,
      embedUrl: true,
      views: true,
      sourceChannel: true,
      sourceChannelUrl: true,
      owner: { select: { username: true, displayName: true } },
    },
  });

  if (shorts.length === 0) {
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

  return <ShortsFeed initial={shorts} loggedIn={!!viewer} />;
}
