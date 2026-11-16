"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type BrowseVideo = { url: string; title: string; thumbnail: string | null };

const PLATFORMS = [
  { id: "youtube", label: "YouTube", placeholder: "@mrbeast or channel URL" },
  { id: "dailymotion", label: "Dailymotion", placeholder: "username" },
];

export default function BrowsePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [platform, setPlatform] = useState("youtube");
  const [channel, setChannel] = useState("");
  const [videos, setVideos] = useState<BrowseVideo[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");

  useEffect(() => {
    fetch("/api/me")
      .then((r) => {
        if (r.status === 401) {
          window.location.href = "/login";
          return null;
        }
        setReady(true);
        return r.json();
      })
      .catch(() => {});
  }, []);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult("");
    if (!channel.trim()) return setError("Enter a channel name first");
    setLoading(true);
    setVideos(null);
    const res = await fetch(
      `/api/browse?platform=${platform}&channel=${encodeURIComponent(channel.trim())}`
    );
    setLoading(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Lookup failed");
      return;
    }
    const list: BrowseVideo[] = data.videos ?? [];
    setVideos(list);
    setSelected(new Set(list.map((_, i) => i)));
    if (list.length === 0) setError("No videos found for that channel. Check the spelling or try the full channel URL.");
  }

  function toggle(i: number) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  }

  async function importSelected() {
    if (!videos || selected.size === 0) return;
    setImporting(true);
    setError("");
    setResult("");
    const urls = videos.filter((_, i) => selected.has(i)).map((v) => v.url);
    const res = await fetch("/api/videos/import/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls }),
    });
    setImporting(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Import failed");
      return;
    }
    setResult(`Imported ${data.created} videos${data.skipped ? ` (${data.skipped} skipped)` : ""}.`);
    setVideos(null);
    setChannel("");
    router.refresh();
  }

  if (!ready) return null;

  const active = PLATFORMS.find((p) => p.id === platform)!;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="mb-2 text-2xl font-bold">Channel browser</h1>
      <p className="mb-6 text-sm text-[#aaaaaa]">
        Find a creator by their username on a supported platform, preview their videos and import
        them to BlameTV as embedded videos. Titles are filled in automatically.
      </p>

      <form onSubmit={search} className="card mb-6 space-y-4 p-6">
        <div className="flex gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setPlatform(p.id);
                setVideos(null);
              }}
              className={`btn ${platform === p.id ? "bg-[#f1f1f1] text-[#0f0f0f]" : "bg-[#272727] hover:bg-[#3f3f3f]"}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            {active.label} channel *
          </label>
          <input
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            placeholder={active.placeholder}
            maxLength={200}
            className="input"
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Searching…" : "Find videos"}
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-[#ff6b6b]">{error}</p>}
      {result && (
        <div className="mb-4 rounded-xl border border-[#1f4a2a] bg-[#122417] px-4 py-3 text-sm text-[#7ddf9a]">
          {result}{" "}
          <Link href="/" className="underline">
            Go to your videos
          </Link>
        </div>
      )}

      {videos && videos.length > 0 && (
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-[#aaaaaa]">
              {selected.size} of {videos.length} selected
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setSelected(new Set(videos.map((_, i) => i)))}
                className="btn !py-1.5 text-xs"
              >
                Select all
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="btn !py-1.5 text-xs"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="grid max-h-[480px] grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2">
            {videos.map((v, i) => (
              <button
                type="button"
                key={v.url}
                onClick={() => toggle(i)}
                className={`flex gap-3 rounded-xl border p-2 text-left transition-colors ${
                  selected.has(i)
                    ? "border-[#3ea6ff] bg-[#12212e]"
                    : "border-[#272727] hover:border-[#3f3f3f]"
                }`}
              >
                <span className="relative block h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-[#212121]">
                  {v.thumbnail && (
                    <img src={v.thumbnail} alt="" className="h-full w-full object-cover" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="line-clamp-2 text-sm font-medium">{v.title}</span>
                </span>
              </button>
            ))}
          </div>
          <button
            onClick={importSelected}
            disabled={importing || selected.size === 0}
            className="btn-primary mt-4 w-full"
          >
            {importing
              ? "Importing…"
              : `Import ${selected.size} video${selected.size === 1 ? "" : "s"}`}
          </button>
        </div>
      )}
    </div>
  );
}
