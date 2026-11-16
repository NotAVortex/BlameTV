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
  _count: { likes: number; comments: number };
};

export default function StudioPage() {
  const dialogs = useDialogs();
  const [data, setData] = useState<{
    videos: StudioVideo[];
    totals: { views: number; likes: number; comments: number };
    subscribers: number;
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
    if (!(await dialogs.confirm({ message: "Delete this video permanently?", danger: true, confirmLabel: "Delete" }))) return;
    const res = await fetch(`/api/videos/${id}`, { method: "DELETE" });
    if (res.ok && data) {
      setData({ ...data, videos: data.videos.filter((v) => v.id !== id) });
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

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-bold">Studio</h1>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          ["Total views", String(data.totals.views)],
          ["Total likes", String(data.totals.likes)],
          ["Total comments", String(data.totals.comments)],
          ["Subscribers", String(data.subscribers)],
        ].map(([label, value]) => (
          <div key={label} className="card p-4">
            <p className="text-xs text-[#aaaaaa]">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-4 text-lg font-semibold">Your videos</h2>
      {data.videos.length === 0 ? (
        <p className="text-sm text-[#aaaaaa]">
          No videos yet. <Link href="/upload" className="text-[#3ea6ff] hover:underline">Upload one</Link>.
        </p>
      ) : (
        <div className="space-y-3">
          {data.videos.map((v) => (
            <div key={v.id} className="card flex flex-wrap items-center gap-4 p-3">
              <div className="h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-[#212121]">
                {v.thumbnailUrl ? (
                  <img src={v.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-[#555555]"><svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8" aria-hidden="true"><path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" /></svg></div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/watch/${v.id}`} className="line-clamp-1 text-sm font-semibold hover:underline">
                  {v.title}
                </Link>
                <p className="text-xs text-[#aaaaaa]">
                  {formatViews(v.views)} views · {v._count.likes} likes · {v._count.comments} comments ·{" "}
                  {timeAgo(v.createdAt)} ·{" "}
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
    </div>
  );
}
