import { db } from "@/lib/db";
import VideoCard from "@/components/VideoCard";

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

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <h1 className="mb-6 text-xl font-bold">
        {query ? `Results for “${query}”` : "Search BlameTV"}
      </h1>
      {!query ? (
        <p className="text-sm text-[#aaaaaa]">Type something in the search bar above.</p>
      ) : videos.length === 0 ? (
        <p className="text-sm text-[#aaaaaa]">No videos found. Try different keywords.</p>
      ) : (
        <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {videos.map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </div>
      )}
    </div>
  );
}
