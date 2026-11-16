import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getRelatedVideos } from "@/lib/recommend";
import VideoCard, { formatViews, timeAgo } from "@/components/VideoCard";
import RecordView from "@/components/RecordView";
import WatchActions from "@/components/WatchActions";
import CommentsTabs from "@/components/CommentsTabs";
import SubscribeButton from "@/components/SubscribeButton";
import VideoPlayer from "@/components/VideoPlayer";
import VerifiedBadge from "@/components/VerifiedBadge";
import { PROVIDER_LABELS } from "@/lib/embed";
import {
  fetchYoutubeChannelMeta,
  youtubeIdFromEmbedUrl,
} from "@/lib/youtube-comments";

async function ensureSourceMeta(video: {
  id: string;
  source: string;
  embedUrl: string | null;
  description: string;
  sourceChannel: string | null;
  sourceChannelUrl: string | null;
  sourceChannelAvatar: string | null;
}): Promise<{ name: string | null; url: string | null; avatar: string | null }> {
  const existing = {
    name: video.sourceChannel,
    url: video.sourceChannelUrl,
    avatar: video.sourceChannelAvatar,
  };
  if (video.source === "UPLOAD" || !video.embedUrl) return existing;
  if (video.sourceChannel || video.sourceChannelUrl) return existing;

  const ytId = youtubeIdFromEmbedUrl(video.embedUrl);
  const meta = ytId ? await fetchYoutubeChannelMeta(ytId) : null;
  const descName =
    /Imported from [^\u2022]+ \u2022 (.+)$/.exec(video.description)?.[1]?.trim() ?? null;
  const name = meta?.name ?? (descName ? descName.slice(0, 100) : null);
  const url = meta?.url ?? null;
  const avatar = meta?.avatar ?? null;

  if (name || url || avatar) {
    await db.video.update({
      where: { id: video.id },
      data: {
        sourceChannel: name ?? undefined,
        sourceChannelUrl: url ?? undefined,
        sourceChannelAvatar: avatar ?? undefined,
      },
    });
  }
  return { name, url, avatar };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const video = await db.video.findUnique({
    where: { id },
    select: {
      title: true,
      description: true,
      thumbnailUrl: true,
      visibility: true,
      sourceChannel: true,
      owner: { select: { displayName: true } },
    },
  });
  if (!video || video.visibility !== "PUBLIC") {
    return { title: "BlameTV" };
  }
  const description =
    video.description.slice(0, 300) ||
    (video.sourceChannel
      ? `A video from ${video.sourceChannel}, on BlameTV`
      : `A video by ${video.owner.displayName}, on BlameTV`);
  return {
    title: video.title,
    description,
    openGraph: {
      title: video.title,
      description,
      type: "video.other",
      images: video.thumbnailUrl ? [{ url: video.thumbnailUrl }] : undefined,
    },
    twitter: {
      card: video.thumbnailUrl ? "summary_large_image" : "summary",
      title: video.title,
      description,
      images: video.thumbnailUrl ? [video.thumbnailUrl] : undefined,
    },
  };
}

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
          verified: true,
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

  const src = await ensureSourceMeta(video);

  const [myLike, likes, dislikes, subscribed, related, myHype, hypeCount] = await Promise.all([
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
    user
      ? db.hype.findUnique({
          where: { userId_videoId: { userId: user.id, videoId: id } },
        })
      : Promise.resolve(null),
    db.hype.count({ where: { videoId: id } }),
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
          <VideoPlayer src={video.videoUrl ?? ""} poster={video.thumbnailUrl} />
        )}

        <h1 className="mt-4 text-xl font-bold">{video.title}</h1>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            {src.name ? (
              <>
                <a
                  href={
                    src.url ??
                    `https://www.youtube.com/results?search_query=${encodeURIComponent(src.name)}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Visit the original channel that made this video"
                  className="flex items-center gap-3"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#3d3d3d] font-bold">
                    {src.avatar ? (
                      <img src={src.avatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      src.name.charAt(0).toUpperCase()
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{src.name}</span>
                    <span className="block text-xs text-[#aaaaaa]">
                      Original creator on {PROVIDER_LABELS[video.source] ?? video.source} —
                      visit channel
                    </span>
                  </span>
                </a>
                <Link
                  href={`/channel/${video.owner.username}`}
                  className="mt-1.5 flex items-center gap-2 text-xs text-[#717171] transition-colors hover:text-[#aaaaaa]"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#3d3d3d] text-[10px] font-bold">
                    {video.owner.avatarUrl ? (
                      <img
                        src={video.owner.avatarUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      video.owner.displayName.charAt(0).toUpperCase()
                    )}
                  </span>
                  <span>
                    Imported by {video.owner.displayName}
                    {video.owner.verified && <VerifiedBadge className="ml-1 inline h-3 w-3" />} ·{" "}
                    {video.owner._count.subscribers} subscribers
                  </span>
                </Link>
              </>
            ) : (
              <Link href={`/channel/${video.owner.username}`} className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[#3d3d3d] font-bold">
                  {video.owner.avatarUrl ? (
                    <img src={video.owner.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    video.owner.displayName.charAt(0).toUpperCase()
                  )}
                </span>
                <span>
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
                    {video.owner.displayName}
                    {video.owner.verified && <VerifiedBadge />}
                  </span>
                  <span className="block text-xs text-[#aaaaaa]">
                    {video.owner._count.subscribers} subscribers
                  </span>
                </span>
              </Link>
            )}
          </div>

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
            videoUrl={video.videoUrl}
            embedUrl={video.embedUrl}
            initialHypeCount={hypeCount}
            initialMyHype={!!myHype}
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

        <CommentsTabs
          videoId={id}
          loggedIn={!!user}
          myUsername={user?.username}
          platformLabel={
            video.embedUrl && /youtube(-nocookie)?\.com|youtu\.be/.test(video.embedUrl)
              ? "YouTube"
              : video.embedUrl && /vimeo\.com/.test(video.embedUrl)
                ? "Vimeo"
                : video.embedUrl && /dailymotion\.com/.test(video.embedUrl)
                  ? "Dailymotion"
                  : video.embedUrl && /twitch\.tv/.test(video.embedUrl)
                    ? "Twitch"
                    : "Streamable"
          }
          platformSupported={
            !!video.embedUrl && /youtube(-nocookie)?\.com|youtu\.be/.test(video.embedUrl)
          }
        />
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
