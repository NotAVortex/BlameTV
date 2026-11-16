import Link from "next/link";
import { db } from "@/lib/db";
import VideoCard from "@/components/VideoCard";
import SearchBox from "@/components/SearchBox";

export const metadata = { title: "Search — BlameTV" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  const { q, sort } = await searchParams;
  const query = (q ?? "").trim();

  const videos = query
    ? await db.video.findMany({
        where: {
          visibility: "PUBLIC",
          OR: [
            { title: { contains: query } },
            { description: { contains: query } },
            { tags: { contains: query } },
          ],
        },
        orderBy: sort === "views" ? { views: "desc" } : { createdAt: "desc" },
        take: 48,
        select: {
          id: true,
          title: true,
          thumbnailUrl: true,
          durationSec: true,
          views: true,
          createdAt: true,
          owner: { select: { username: true, displayName: true, avatarUrl: true } },
        },
      })
    : [];

  const people = query
    ? await db.user.findMany({
        where: {
          OR: [
            { username: { contains: query } },
            { displayName: { contains: query } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          username: true,
          displayName: true,
          avatarUrl: true,
          bannerUrl: true,
          _count: { select: { videos: true, subscribers: true } },
        },
      })
    : [];

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <SearchBox initial={query} />
      <h1 className="mb-6 text-xl font-bold">
        {query ? `Results for “${query}”` : "Search BlameTV"}
      </h1>
      {!query ? (
        <p className="text-sm text-[#aaaaaa]">Type something in the search bar above.</p>
      ) : (
        <>
          {people.length > 0 && (
            <>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#717171]">
                People
              </h2>
              <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {people.map((p) => (
                  <Link
                    key={p.username}
                    href={`/channel/${p.username}`}
                    className="card flex items-center gap-3 p-3 transition-transform hover:-translate-y-0.5"
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#3d3d3d] text-lg font-bold">
                      {p.avatarUrl ? (
                        <img src={p.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        p.displayName.charAt(0).toUpperCase()
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">
                        {p.displayName}
                      </span>
                      <span className="block truncate text-xs text-[#aaaaaa]">
                        @{p.username} · {p._count.videos} videos · {p._count.subscribers}{" "}
                        subscribers
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </>
          )}

          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#717171]">
            Videos
          </h2>
          {videos.length === 0 ? (
            <p className="text-sm text-[#aaaaaa]">No videos found. Try different keywords.</p>
          ) : (
            <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {videos.map((v) => (
                <VideoCard key={v.id} video={v} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
