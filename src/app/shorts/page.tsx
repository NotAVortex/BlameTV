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

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-1 text-2xl font-bold">Shorts</h1>
      <p className="mb-6 text-sm text-[#aaaaaa]">
        Vertical videos, detected automatically when a short is imported from YouTube. Scroll or
        swipe to the next one — when you reach the end, the feed reshuffles and keeps going forever.
      </p>
      {shorts.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-[#aaaaaa]">
            No shorts yet. Import a vertical video from YouTube and it appears here automatically.
          </p>
          <Link href="/browse" className="btn-primary mt-4 inline-block">
            Import videos
          </Link>
        </div>
      ) : (
        <ShortsFeed initial={shorts} loggedIn={!!viewer} />
      )}
    </div>
  );
}
