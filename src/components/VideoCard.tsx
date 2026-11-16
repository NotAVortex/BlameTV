import Link from "next/link";

export type VideoCardData = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  durationSec: number;
  views: number;
  createdAt: Date | string;
  owner: { username: string; displayName: string; avatarUrl?: string | null };
  sourceChannel?: string | null;
  sourceChannelUrl?: string | null;
  sourceChannelAvatar?: string | null;
};

export function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

export function formatViews(views: number): string {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K`;
  return String(views);
}

export function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  const units: [number, string][] = [
    [31536000, "year"],
    [2592000, "month"],
    [604800, "week"],
    [86400, "day"],
    [3600, "hour"],
    [60, "minute"],
  ];
  for (const [u, label] of units) {
    const n = Math.floor(sec / u);
    if (n >= 1) return `${n} ${label}${n > 1 ? "s" : ""} ago`;
  }
  return "just now";
}

export default function VideoCard({ video }: { video: VideoCardData }) {
  return (
    <div className="group transition-transform duration-200 hover:-translate-y-0.5">
      <Link href={`/watch/${video.id}`} className="block">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-[#212121]">
          {video.thumbnailUrl ? (
            <img
              src={video.thumbnailUrl}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[#555555]">
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-10 w-10"
                aria-hidden="true"
              >
                <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
              </svg>
            </div>
          )}
          {video.durationSec > 0 && (
            <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium">
              {formatDuration(video.durationSec)}
            </span>
          )}
        </div>
      </Link>
      <div className="mt-2 flex gap-3">
        <Link href={`/channel/${video.owner.username}`} className="shrink-0">
          <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#3d3d3d] text-sm font-bold">
            {video.owner.avatarUrl ? (
              <img src={video.owner.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              video.owner.displayName.charAt(0).toUpperCase()
            )}
          </span>
        </Link>
        <div className="min-w-0">
          <Link href={`/watch/${video.id}`}>
            <h3 className="line-clamp-2 text-sm font-semibold leading-5">{video.title}</h3>
          </Link>
          {video.sourceChannel ? (
            <>
              <a
                href={
                  video.sourceChannelUrl ??
                  `https://www.youtube.com/results?search_query=${encodeURIComponent(video.sourceChannel)}`
                }
                target="_blank"
                rel="noopener noreferrer"
                title={`Watch more from ${video.sourceChannel} on their original channel`}
                className="mt-1 flex items-center gap-1.5 text-xs font-medium text-[#f1f1f1] hover:text-[#3ea6ff]"
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#3d3d3d] text-[8px] font-bold">
                  {video.sourceChannelAvatar ? (
                    <img
                      src={video.sourceChannelAvatar}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    video.sourceChannel.charAt(0).toUpperCase()
                  )}
                </span>
                <span className="truncate">{video.sourceChannel}</span>
              </a>
              <Link
                href={`/channel/${video.owner.username}`}
                className="mt-0.5 block text-[11px] text-[#717171] hover:text-[#aaaaaa]"
              >
                Imported by {video.owner.displayName}
              </Link>
            </>
          ) : (
            <Link
              href={`/channel/${video.owner.username}`}
              className="mt-1 block text-xs text-[#aaaaaa] hover:text-[#f1f1f1]"
            >
              {video.owner.displayName}
            </Link>
          )}
          <p className="text-xs text-[#aaaaaa]">
            {formatViews(video.views)} views · {timeAgo(video.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
}
