"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatViews, timeAgo } from "@/components/VideoCard";
import { useDialogs } from "@/components/dialogs";

type HistoryItem = {
  videoId: string;
  watchedAt: string;
  video: {
    id: string;
    title: string;
    thumbnailUrl: string | null;
    durationSec: number;
    views: number;
    owner: { displayName: string; username: string };
  };
};

export default function HistoryPage() {
  const dialogs = useDialogs();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    fetch("/api/me/history")
      .then(async (r) => {
        if (r.status === 401) {
          window.location.href = "/login";
          return;
        }
        const d = await r.json();
        setHistory(d.history ?? []);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, []);

  async function clearAll() {
    if (!(await dialogs.confirm({ message: "Clear your entire watch history? This cannot be undone.", danger: true, confirmLabel: "Clear" }))) return;
    await fetch("/api/me/history", { method: "DELETE" });
    setHistory([]);
  }

  function removeOne(videoId: string) {
    setHistory((h) => h.filter((x) => x.videoId !== videoId));
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold sm:text-2xl">Watch history</h1>
        {history.length > 0 && (
          <button onClick={clearAll} className="btn-ghost text-xs !text-[#ff6b6b]">
            Clear all history
          </button>
        )}
      </div>

      <p className="mb-6 text-xs text-[#717171]">
        Your watch history is private — only you can see it.
      </p>

      {state === "loading" && <p className="text-sm text-[#aaaaaa]">Loading…</p>}
      {state === "error" && <p className="text-sm text-[#ff6b6b]">Failed to load history.</p>}
      {state === "ready" && history.length === 0 && (
        <p className="text-sm text-[#aaaaaa]">
          Nothing here yet. <Link href="/" className="text-[#3ea6ff] hover:underline">Watch something</Link>.
        </p>
      )}

      <div className="space-y-3">
        {history.map((h) => (
          <div key={h.videoId} className="card flex items-center gap-4 p-3">
            <Link href={`/watch/${h.video.id}`} className="h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-[#212121]">
              {h.video.thumbnailUrl ? (
                <img src={h.video.thumbnailUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-[#555555]"><svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8" aria-hidden="true"><path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" /></svg></div>
              )}
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={`/watch/${h.video.id}`} className="line-clamp-1 text-sm font-semibold hover:underline">
                {h.video.title}
              </Link>
              <p className="text-xs text-[#aaaaaa]">
                {h.video.owner.displayName} · {formatViews(h.video.views)} views · watched{" "}
                {timeAgo(h.watchedAt)}
              </p>
            </div>
            <button
              onClick={() => removeOne(h.video.id)}
              aria-label="Remove from history"
              className="btn-ghost !px-3 !py-1.5 text-xs"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
