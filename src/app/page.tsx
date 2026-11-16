import Link from "next/link";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getPersonalFeed } from "@/lib/recommend";
import VideoCard from "@/components/VideoCard";
import { CATEGORIES } from "@/lib/validation";

export const metadata = { title: "BlameTV" };

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const user = await getSessionUser();

  if (category) {
    const videos = await db.video.findMany({
      where: { visibility: "PUBLIC", category },
      orderBy: { createdAt: "desc" },
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
    });

    return (
      <div className="px-6 py-4">
        <CategoryNav active={category} />
        <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {videos.map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </div>
      </div>
    );
  }

  const feed = await getPersonalFeed(user?.id ?? null, 48);

  return (
    <div className="px-6 py-4">
      <CategoryNav />
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
            ✨ personalized
          </span>
        </h1>
      )}
      <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {feed.map((v) => (
          <div key={v.id}>
            <VideoCard video={v} />
            {v.reason && <p className="mt-1 text-[11px] text-[#717171]">✨ {v.reason}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryNav({ active }: { active?: string }) {
  return (
    <nav className="mb-6 flex flex-wrap gap-2">
      <Link
        href="/"
        className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
          !active ? "bg-[#f1f1f1] text-[#0f0f0f]" : "bg-[#272727] hover:bg-[#3f3f3f]"
        }`}
      >
        All
      </Link>
      {CATEGORIES.map((c) => (
        <Link
          key={c}
          href={`/?category=${encodeURIComponent(c)}`}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            active === c ? "bg-[#f1f1f1] text-[#0f0f0f]" : "bg-[#272727] hover:bg-[#3f3f3f]"
          }`}
        >
          {c}
        </Link>
      ))}
    </nav>
  );
}
