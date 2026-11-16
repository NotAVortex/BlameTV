"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatViews, timeAgo } from "@/components/VideoCard";
import { useDialogs } from "@/components/dialogs";

type StudioVideo = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  visibility: string;
  views: number;
  createdAt: string;
  _count: { likes: number; comments: number; hypes: number };
};

type StudioComment = {
  id: string;
  body: string;
  createdAt: string;
  author: { username: string; displayName: string; avatarUrl: string | null };
  video: { id: string; title: string };
};

type Tab = "overview" | "videos" | "comments";

export default function StudioPage() {
  const dialogs = useDialogs();
  const [tab, setTab] = useState<Tab>("overview");
  const [data, setData] = useState<{
    videos: StudioVideo[];
    totals: { views: number; likes: number; comments: number; hypes: number };
    subscribers: number;
    recentComments: StudioComment[];
  } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/me/studio")
      .then(async (r) => {
        if (r.status === 401) {
          window.location.href = "/login";
          return;
        }
        setData(await r.json());
      })
      .catch(() => setError("Failed to load"));
  }, []);

  async function remove(id: string) {
    if (
      !(await dialogs.confirm({
        message: "Delete this video permanently? The files are removed from storage too.",
        danger: true,
        confirmLabel: "Delete",
      }))
    )
      return;
    const res = await fetch(`/api/videos/${id}`, { method: "DELETE" });
    if (res.ok && data) {
      setData({ ...data, videos: data.videos.filter((v) => v.id !== id) });
    }
  }

  async function removeComment(id: string) {
    if (
      !(await dialogs.confirm({
        message: "Delete this comment?",
        danger: true,
        confirmLabel: "Delete",
      }))
    )
      return;
    const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
    if (res.ok && data) {
      setData({
        ...data,
        recentComments: data.recentComments.filter((c) => c.id !== id),
      });
    }
  }

  async function toggleVisibility(v: StudioVideo) {
    const next = v.visibility === "PUBLIC" ? "PRIVATE" : "PUBLIC";
    const res = await fetch(`/api/videos/${v.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility: next }),
    });
    if (res.ok && data) {
      setData({
        ...data,
        videos: data.videos.map((x) => (x.id === v.id ? { ...x, visibility: next } : x)),
      });
    }
  }

  if (error) return <p className="p-8 text-sm text-[#ff6b6b]">{error}</p>;
  if (!data) return <p className="p-8 text-sm text-[#aaaaaa]">Loading…</p>;

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "videos", label: `Videos (${data.videos.length})` },
    { id: "comments", label: `Comments (${data.recentComments.length})` },
  ];

  const topVideos = [...data.videos].sort((a, b) => b.views - a.views).slice(0, 8);
  const maxViews = Math.max(1, ...topVideos.map((v) => v.views));
  const engagement = [
    { label: "Likes", value: data.totals.likes, color: "#3ea6ff" },
    { label: "Comments", value: data.totals.comments, color: "#7ddf9a" },
    { label: "Hypes", value: data.totals.hypes, color: "#ffa726" },
  ];
  const maxEngagement = Math.max(1, ...engagement.map((e) => e.value));

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-bold">Studio</h1>

      <div className="mb-6 flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t.id
                ? "bg-[#f1f1f1] text-[#0f0f0f]"
                : "bg-[#272727] text-[#aaaaaa] hover:bg-[#3f3f3f]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
            {[
              ["Total views", String(data.totals.views)],
              ["Total likes", String(data.totals.likes)],
              ["Total comments", String(data.totals.comments)],
              ["Total hypes", String(data.totals.hypes)],
              ["Subscribers", String(data.subscribers)],
            ].map(([label, value]) => (
              <div key={label} className="card p-4">
                <p className="text-xs text-[#aaaaaa]">{label}</p>
                <p className="mt-1 text-2xl font-bold">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card p-5">
              <h2 className="mb-1 text-lg font-semibold">Most viewed videos</h2>
              <p className="mb-4 text-xs text-[#aaaaaa]">
                Your top {topVideos.length === 0 ? "0" : topVideos.length} videos by total views.
              </p>
              {topVideos.length === 0 ? (
                <p className="text-sm text-[#aaaaaa]">No videos yet to draw a chart.</p>
              ) : (
                <div className="space-y-3">
                  {topVideos.map((v) => (
                    <div key={v.id}>
                      <div className="mb-1 flex justify-between gap-3 text-xs">
                        <Link href={`/watch/${v.id}`} className="min-w-0 truncate hover:underline">
                          {v.title}
                        </Link>
                        <span className="shrink-0 text-[#aaaaaa]">{formatViews(v.views)}</span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#272727]">
                        <div
                          className="h-full rounded-full bg-[#3ea6ff] transition-all duration-700"
                          style={{ width: `${Math.max(3, (v.views / maxViews) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card p-5">
              <h2 className="mb-1 text-lg font-semibold">Engagement</h2>
              <p className="mb-4 text-xs text-[#aaaaaa]">
                How people interact with your videos across everything you published.
              </p>
              <div className="space-y-4">
                {engagement.map((e) => (
                  <div key={e.label}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span>{e.label}</span>
                      <span className="text-[#aaaaaa]">{e.value}</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#272727]">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.max(3, (e.value / maxEngagement) * 100)}%`,
                          backgroundColor: e.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-xs text-[#717171]">
                Hypes are strong recommendations from viewers. They boost your videos in feeds.
              </p>
            </div>
          </div>
        </>
      )}

      {tab === "videos" && (
        <>
          {data.videos.length === 0 ? (
            <p className="text-sm text-[#aaaaaa]">
              No videos yet.{" "}
              <Link href="/upload" className="text-[#3ea6ff] hover:underline">
                Add one
              </Link>
              .
            </p>
          ) : (
            <div className="space-y-3">
              {data.videos.map((v) => (
                <div key={v.id} className="card flex flex-wrap items-center gap-4 p-3">
                  <div className="h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-[#212121]">
                    {v.thumbnailUrl ? (
                      <img src={v.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[#555555]">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8" aria-hidden="true">
                          <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/watch/${v.id}`}
                      className="line-clamp-1 text-sm font-semibold hover:underline"
                    >
                      {v.title}
                    </Link>
                    <p className="text-xs text-[#aaaaaa]">
                      {formatViews(v.views)} views · {v._count.likes} likes ·{" "}
                      {v._count.comments} comments · {v._count.hypes} hypes · {timeAgo(v.createdAt)} ·{" "}
                      <span className={v.visibility === "PUBLIC" ? "text-[#3ea6ff]" : "text-[#ffb84d]"}>
                        {v.visibility}
                      </span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => toggleVisibility(v)} className="btn-ghost !py-1.5 text-xs">
                      {v.visibility === "PUBLIC" ? "Unpublish" : "Publish"}
                    </button>
                    <button
                      onClick={() => remove(v.id)}
                      className="btn-ghost !py-1.5 text-xs !text-[#ff6b6b]"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "comments" && (
        <>
          {data.recentComments.length === 0 ? (
            <p className="text-sm text-[#aaaaaa]">No comments on your videos yet.</p>
          ) : (
            <div className="space-y-3">
              {data.recentComments.map((c) => (
                <div key={c.id} className="card flex items-start gap-3 p-4">
                  <Link
                    href={`/channel/${c.author.username}`}
                    className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-[#272727]"
                  >
                    {c.author.avatarUrl && (
                      <img src={c.author.avatarUrl} alt="" className="h-full w-full object-cover" />
                    )}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-[#aaaaaa]">
                      <Link href={`/channel/${c.author.username}`} className="font-medium text-[#f1f1f1] hover:underline">
                        {c.author.displayName}
                      </Link>{" "}
                      on{" "}
                      <Link href={`/watch/${c.video.id}`} className="text-[#3ea6ff] hover:underline">
                        {c.video.title}
                      </Link>{" "}
                      · {timeAgo(c.createdAt)}
                    </p>
                    <p className="mt-1 break-words text-sm">{c.body}</p>
                  </div>
                  <button
                    onClick={() => removeComment(c.id)}
                    className="btn-ghost !py-1.5 text-xs !text-[#ff6b6b]"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
