import Link from "next/link";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getPersonalFeed, randomPublicIdsInCategory } from "@/lib/recommend";
import VideoCard from "@/components/VideoCard";
import HomeFeed from "@/components/HomeFeed";

export const metadata = { title: "BlameTV" };

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const user = await getSessionUser();

  if (category) {
    const ids = await randomPublicIdsInCategory(category, 48);
    const videos = await db.video.findMany({
      where: { visibility: "PUBLIC", category, id: { in: ids } },
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

    return (
      <div className="px-6 py-4">
        <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {videos.map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </div>
      </div>
    );
  }

  const [feed, hyped] = await Promise.all([
    getPersonalFeed(user?.id ?? null, 48),
    db.video.findMany({
      where: { visibility: "PUBLIC", hypes: { some: {} } },
      orderBy: { hypes: { _count: "desc" } },
      take: 4,
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
    }),
  ]);

  return (
    <div className="px-6 py-4">
      {!user && (
        <p className="mb-6 rounded-xl bg-[#181818] px-4 py-3 text-sm text-[#aaaaaa]">
          Watching anonymously — showing trending videos.{" "}
          <Link href="/login" className="text-[#3ea6ff] hover:underline">
            Sign in
          </Link>{" "}
          for a personalized feed.
        </p>
      )}
      {user && (
        <h1 className="mb-4 text-lg font-semibold">
          Recommended for you
          <span className="ml-2 rounded-full bg-[#272727] px-2 py-0.5 text-xs font-normal text-[#aaaaaa]">
            personalized
          </span>
        </h1>
      )}
      {hyped.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[#717171]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <path d="M4.5 16.5c-1.5 1.5-2 5-2 5s3.5-.5 5-2c.8-.8.8-2.2 0-3-.8-.8-2.2-.8-3 0zM12 15l-3-3c.9-2.3 2.4-4.5 4-6 3-3 7-4 9-2 .8-2.5 0-5 0-5s-2.5-.8-5 0c2-2 5-2 5-2s0 3-2 5c1.5 2 .5 6-2 9-1.5 1.6-3.7 3.1-6 4z" />
            </svg>
            Hyped by the community
          </h2>
          <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {hyped.map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </div>
        </section>
      )}
      <HomeFeed initial={feed} />
    </div>
  );
}
