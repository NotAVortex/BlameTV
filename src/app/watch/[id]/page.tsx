import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getRelatedVideos } from "@/lib/recommend";
import VideoCard, { formatViews, timeAgo } from "@/components/VideoCard";
import RecordView from "@/components/RecordView";
import WatchActions from "@/components/WatchActions";
import Comments from "@/components/Comments";
import SubscribeButton from "@/components/SubscribeButton";

export default async function WatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();

  const video = await db.video.findUnique({
    where: { id },
    include: {
      owner: {
        select: {
          id: true,
          username: true,
          displayName: true,
          bio: true,
          avatarUrl: true,
          _count: { select: { subscribers: true } },
        },
      },
      _count: { select: { likes: true, comments: true } },
    },
  });

  if (!video) notFound();

  const isOwner = user?.id === video.ownerId;
  const isAdmin = user?.role === "ADMIN";
  if (video.visibility !== "PUBLIC" && !isOwner && !isAdmin) notFound();

  const [myLike, likes, dislikes, subscribed, related] = await Promise.all([
    user
      ? db.videoLike.findUnique({
          where: { userId_videoId: { userId: user.id, videoId: id } },
        })
      : Promise.resolve(null),
    db.videoLike.count({ where: { videoId: id, value: 1 } }),
    db.videoLike.count({ where: { videoId: id, value: -1 } }),
    user
      ? db.subscription.findUnique({
          where: {
            subscriberId_channelId: { subscriberId: user.id, channelId: video.ownerId },
          },
        })
      : Promise.resolve(null),
    getRelatedVideos(id, 12),
  ]);

  return (
    <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <RecordView videoId={id} />

      <div className="min-w-0">
        {video.embedUrl ? (
          <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
            <iframe
              src={video.embedUrl}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              className="h-full w-full"
            />
          </div>
        ) : (
          <video
            controls
            preload="metadata"
            poster={video.thumbnailUrl ?? undefined}
            className="aspect-video w-full rounded-xl bg-black"
          >
            <source src={video.videoUrl ?? ""} />
            Your browser does not support video playback.
          </video>
        )}

        <h1 className="mt-4 text-xl font-bold">{video.title}</h1>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <Link href={`/channel/${video.owner.username}`} className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[#3d3d3d] font-bold">
              {video.owner.avatarUrl ? (
                <img src={video.owner.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                video.owner.displayName.charAt(0).toUpperCase()
              )}
            </span>
            <span>
              <span className="block text-sm font-semibold">{video.owner.displayName}</span>
              <span className="block text-xs text-[#aaaaaa]">
                {video.owner._count.subscribers} subscribers
              </span>
            </span>
          </Link>

          <SubscribeButton
            username={video.owner.username}
            initialSubscribed={!!subscribed}
            initialCount={video.owner._count.subscribers}
            loggedIn={!!user}
            isSelf={isOwner}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[#aaaaaa]">
            {formatViews(video.views)} views · {timeAgo(video.createdAt)} ·{" "}
            <span className="rounded-full bg-[#272727] px-2 py-0.5 text-xs">{video.category}</span>
            {video.source !== "UPLOAD" && (
              <span className="ml-2 rounded-full bg-[#272727] px-2 py-0.5 text-xs text-[#3ea6ff]">
                {video.source.toLowerCase()} embed
              </span>
            )}
          </p>
          <WatchActions
            videoId={id}
            initialLikes={likes}
            initialDislikes={dislikes}
            initialMyLike={myLike?.value ?? 0}
            isOwner={isOwner}
            loggedIn={!!user}
          />
        </div>

        {video.description && (
          <div className="card mt-4 p-4">
            <p className="whitespace-pre-wrap break-words text-sm">{video.description}</p>
            {video.tags && (
              <p className="mt-3 text-xs text-[#3ea6ff]">
                {video.tags.split(",").map((t) => t.trim()).filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        )}

        <Comments videoId={id} loggedIn={!!user} myUsername={user?.username} />
      </div>

      <aside className="min-w-0">
        <h2 className="mb-4 text-sm font-semibold text-[#aaaaaa]">Up next</h2>
        <div className="space-y-4">
          {related.map((v) => (
            <div key={v.id}>
              <VideoCard video={v} />
              {v.reason && <p className="mt-1 text-[11px] text-[#717171]">{v.reason}</p>}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
