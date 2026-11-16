import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import VideoCard, { timeAgo } from "@/components/VideoCard";
import SubscribeButton from "@/components/SubscribeButton";
import VerifiedBadge from "@/components/VerifiedBadge";
import ChannelVideoManager from "@/components/ChannelVideoManager";
import WhisperWall from "@/components/WhisperWall";
import CommunityPosts from "@/components/CommunityPosts";

export default async function ChannelPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { username } = await params;
  const sp = await searchParams;
  const tabParam = typeof sp.tab === "string" ? sp.tab : "videos";
  const tab = tabParam === "shorts" || tabParam === "community" ? tabParam : "videos";
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

  const [videos, shorts] = await Promise.all([
    db.video.findMany({
      where: { ownerId: channel.id, visibility: "PUBLIC", isShort: false },
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
    }),
    db.video.findMany({
      where: { ownerId: channel.id, visibility: "PUBLIC", isShort: true },
      orderBy: { createdAt: "desc" },
      take: 100,
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

  const tabs = [
    { id: "videos", label: `Videos ${videos.length}` },
    { id: "shorts", label: `Shorts ${shorts.length}` },
    { id: "community", label: "Community" },
  ] as const;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div
        className={`h-32 w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#272727] to-[#3d3d3d] bg-cover bg-center sm:h-48 ${
          !channel.bannerUrl && gradient ? "anim-gradient" : ""
        }`}
        style={
          channel.bannerUrl
            ? { backgroundImage: `url(${channel.bannerUrl})` }
            : gradient
              ? { background: gradient }
              : undefined
        }
      />

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
        <span
          className={`flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#3d3d3d] text-2xl font-bold ${
            channel.pfpRing ? "anim-ring" : ""
          }`}
          style={
            channel.pfpRing
              ? ({ "--ring-color": channel.pfpRing } as React.CSSProperties)
              : undefined
          }
        >
          {channel.avatarUrl ? (
            <img src={channel.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            channel.displayName.charAt(0).toUpperCase()
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-2 break-words text-xl font-bold sm:text-2xl">
            {channel.displayName}
            {channel.verified && <VerifiedBadge className="h-4 w-4 sm:h-5 sm:w-5" />}
          </h1>
          <p className="break-words text-sm text-[#aaaaaa]">
            @{channel.username} ·{" "}
            {channel.hideSubscriptions
              ? "Subscribers hidden"
              : `${channel._count.subscribers} subscribers`}{" "}
            · {channel._count.videos} videos · joined {timeAgo(channel.createdAt)}
          </p>
          {channel.bio && (
            <p className="mt-1 break-words text-sm text-[#aaaaaa]">{channel.bio}</p>
          )}
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
                    className="h-3.5 w-3.5 shrink-0"
                    aria-hidden="true"
                  >
                    <path
                      d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5M10.5 13.5L21 3m0 0h-5.25M21 3v5.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="max-w-[160px] truncate sm:max-w-none">{l.label}</span>
                </a>
              ))}
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2 sm:hidden">
            {viewer && viewer.username !== channel.username && (
              <a
                href="#whispers"
                className="btn flex-1"
                style={
                  channel.accentColor
                    ? { borderColor: channel.accentColor, color: channel.accentColor }
                    : undefined
                }
              >
                Whisper
              </a>
            )}
            <div className={viewer && viewer.username !== channel.username ? "flex-1" : "w-full sm:w-auto"}>
              <SubscribeButton
                username={channel.username}
                initialSubscribed={subscribed}
                initialCount={channel._count.subscribers}
                loggedIn={!!viewer}
                isSelf={viewer?.username === channel.username}
              />
            </div>
          </div>
        </div>
        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          {viewer && viewer.username !== channel.username && (
            <a
              href="#whispers"
              className="btn"
              style={
                channel.accentColor
                  ? { borderColor: channel.accentColor, color: channel.accentColor }
                  : undefined
              }
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

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={`/channel/${channel.username}?tab=${t.id}`}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t.id
                ? "bg-[#f1f1f1] text-[#0f0f0f]"
                : "bg-[#272727] text-[#aaaaaa] hover:bg-[#3f3f3f]"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "videos" && (
        <div className="mt-6">
          {videos.length === 0 ? (
            <p className="text-sm text-[#aaaaaa]">This channel has no public videos yet.</p>
          ) : isOwnChannel ? (
            <ChannelVideoManager videos={videos} />
          ) : (
            <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {videos.map((v) => (
                <VideoCard key={v.id} video={v} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "shorts" && (
        <div className="mt-6">
          {shorts.length === 0 ? (
            <div className="card p-6 text-center">
              <p className="text-sm text-[#aaaaaa]">No shorts on this channel yet.</p>
              <p className="mt-1 text-xs text-[#717171]">
                Shorts are vertical videos — BlameTV detects them automatically when a YouTube
                video is imported.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {shorts.map((v) => (
                <VideoCard key={v.id} video={v} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "community" && (
        <div className="mt-6">
          <CommunityPosts
            username={channel.username}
            loggedIn={!!viewer}
            isOwner={isOwnChannel}
            isAdmin={viewer?.role === "ADMIN"}
            accentColor={channel.accentColor}
            viewerUsername={viewer?.username ?? null}
          />
        </div>
      )}

      <div className="mt-10" id="whispers">
        <WhisperWall
          username={channel.username}
          loggedIn={!!viewer}
          viewerUsername={viewer?.username ?? null}
        />
      </div>
    </div>
  );
}
