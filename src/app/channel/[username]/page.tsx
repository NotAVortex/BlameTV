import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import VideoCard, { timeAgo } from "@/components/VideoCard";
import SubscribeButton from "@/components/SubscribeButton";

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const viewer = await getSessionUser();

  const channel = await db.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
      bannerUrl: true,
      createdAt: true,
      _count: { select: { subscribers: true, videos: true } },
    },
  });
  if (!channel) notFound();

  const videos = await db.video.findMany({
    where: { ownerId: channel.id, visibility: "PUBLIC" },
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

  const subscribed = viewer
    ? !!(await db.subscription.findUnique({
        where: {
          subscriberId_channelId: { subscriberId: viewer.id, channelId: channel.id },
        },
      }))
    : false;

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <div
        className="h-36 w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#272727] to-[#3d3d3d] bg-cover bg-center sm:h-48"
        style={channel.bannerUrl ? { backgroundImage: `url(${channel.bannerUrl})` } : undefined}
      />

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <span className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[#3d3d3d] text-2xl font-bold">
          {channel.avatarUrl ? (
            <img src={channel.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            channel.displayName.charAt(0).toUpperCase()
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">{channel.displayName}</h1>
          <p className="text-sm text-[#aaaaaa]">
            @{channel.username} · {channel._count.subscribers} subscribers ·{" "}
            {channel._count.videos} videos · joined {timeAgo(channel.createdAt)}
          </p>
          {channel.bio && <p className="mt-1 max-w-xl text-sm text-[#aaaaaa]">{channel.bio}</p>}
        </div>
        <SubscribeButton
          username={channel.username}
          initialSubscribed={subscribed}
          initialCount={channel._count.subscribers}
          loggedIn={!!viewer}
          isSelf={viewer?.username === channel.username}
        />
      </div>

      <h2 className="mb-4 mt-10 text-lg font-semibold">Videos</h2>
      {videos.length === 0 ? (
        <p className="text-sm text-[#aaaaaa]">This channel has no public videos yet.</p>
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
