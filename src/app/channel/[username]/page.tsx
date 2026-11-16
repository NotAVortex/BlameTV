import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import VideoCard, { timeAgo } from "@/components/VideoCard";
import SubscribeButton from "@/components/SubscribeButton";
import VerifiedBadge from "@/components/VerifiedBadge";
import ChannelVideoManager from "@/components/ChannelVideoManager";
import WhisperWall from "@/components/WhisperWall";

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
      verified: true,
      accentColor: true,
      bgFrom: true,
      bgTo: true,
      pfpRing: true,
      links: true,
      hideSubscriptions: true,
      createdAt: true,
      _count: { select: { subscribers: true, videos: true } },
    },
  });
  if (!channel) notFound();
  const isOwnChannel = viewer?.id === channel.id;

  let links: { label: string; url: string }[] = [];
  try {
    links = channel.links ? (JSON.parse(channel.links) as { label: string; url: string }[]) : [];
  } catch {
    links = [];
  }

  const videos = await db.video.findMany({
    where: { ownerId: channel.id, visibility: "PUBLIC" },
    orderBy: { createdAt: "desc" },
    take: 500,
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

  const subscribed = viewer
    ? !!(await db.subscription.findUnique({
        where: {
          subscriberId_channelId: { subscriberId: viewer.id, channelId: channel.id },
        },
      }))
    : false;

  const gradient =
    channel.bgFrom && channel.bgTo
      ? `linear-gradient(135deg, ${channel.bgFrom}, ${channel.bgTo})`
      : null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <div
        className="h-36 w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#272727] to-[#3d3d3d] bg-cover bg-center sm:h-48"
        style={
          channel.bannerUrl
            ? { backgroundImage: `url(${channel.bannerUrl})` }
            : gradient
              ? { background: gradient }
              : undefined
        }
      />

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <span
          className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#3d3d3d] text-2xl font-bold"
          style={channel.pfpRing ? { boxShadow: `0 0 0 3px ${channel.pfpRing}` } : undefined}
        >
          {channel.avatarUrl ? (
            <img src={channel.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            channel.displayName.charAt(0).toUpperCase()
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            {channel.displayName}
            {channel.verified && <VerifiedBadge className="h-5 w-5" />}
          </h1>
          <p className="text-sm text-[#aaaaaa]">
            @{channel.username} ·{" "}
            {channel.hideSubscriptions
              ? "Subscribers hidden"
              : `${channel._count.subscribers} subscribers`}{" "}
            · {channel._count.videos} videos · joined {timeAgo(channel.createdAt)}
          </p>
          {channel.bio && <p className="mt-1 max-w-xl text-sm text-[#aaaaaa]">{channel.bio}</p>}
          {links.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {links.map((l) => (
                <a
                  key={l.url}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#272727] px-3 py-1 text-xs transition-colors hover:bg-[#3f3f3f]"
                  style={channel.accentColor ? { color: channel.accentColor } : undefined}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    className="h-3.5 w-3.5"
                    aria-hidden="true"
                  >
                    <path
                      d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5M10.5 13.5L21 3m0 0h-5.25M21 3v5.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {l.label}
                </a>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {viewer && viewer.username !== channel.username && (
            <a
              href="#whispers"
              className="btn"
              style={channel.accentColor ? { borderColor: channel.accentColor, color: channel.accentColor } : undefined}
            >
              Whisper
            </a>
          )}
          <SubscribeButton
            username={channel.username}
            initialSubscribed={subscribed}
            initialCount={channel._count.subscribers}
            loggedIn={!!viewer}
            isSelf={viewer?.username === channel.username}
          />
        </div>
      </div>

      <div className="mt-10" id="whispers">
        <WhisperWall
          username={channel.username}
          loggedIn={!!viewer}
          viewerUsername={viewer?.username ?? null}
        />
      </div>

      <div className="mt-4">
        {videos.length === 0 ? (
          <>
            <h2 className="mb-4 text-lg font-semibold">Videos</h2>
            <p className="text-sm text-[#aaaaaa]">This channel has no public videos yet.</p>
          </>
        ) : isOwnChannel ? (
          <ChannelVideoManager videos={videos} />
        ) : (
          <>
            <h2 className="mb-4 text-lg font-semibold">Videos</h2>
            <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {videos.map((v) => (
                <VideoCard key={v.id} video={v} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
