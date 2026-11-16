"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES } from "@/lib/validation";

type ScanVideo = { url: string; title: string; thumbnail: string | null };

export default function UploadPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"video" | "shorts">("video");
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const [channelInput, setChannelInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ScanVideo[] | null>(null);
  const [scanChannel, setScanChannel] = useState<{ name: string; url: string | null } | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [shortsAccepted, setShortsAccepted] = useState(false);
  const [scanMsg, setScanMsg] = useState("");

  async function submitLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!accepted) return setError("Please confirm you have the right to embed this video");
    const form = e.currentTarget;
    const data = new FormData(form);
    setImporting(true);

    const res = await fetch("/api/videos/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: data.get("url"),
        category: data.get("category"),
        visibility: data.get("visibility"),
      }),
    });
    setImporting(false);
    if (res.status === 201) {
      const { id } = await res.json();
      router.push(`/watch/${id}`);
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Import failed");
    }
  }

  async function scanShorts(e: React.FormEvent) {
    e.preventDefault();
    if (!channelInput.trim() || scanning) return;
    setScanning(true);
    setError("");
    setScanMsg("");
    setScanResults(null);
    setScanChannel(null);
    setSelected([]);
    try {
      const res = await fetch(
        `/api/browse?platform=youtube&mode=shorts&channel=${encodeURIComponent(channelInput.trim())}`
      );
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error ?? "Could not scan that channel");
        return;
      }
      const vids = (d.videos ?? []) as ScanVideo[];
      if (vids.length === 0) {
        setError("No shorts found on that channel. Check the spelling or try the channel URL.");
        return;
      }
      setScanResults(vids);
      setSelected(vids.map((v) => v.url));
      if (d.channel?.name) setScanChannel({ name: d.channel.name, url: d.channel.url });
    } finally {
      setScanning(false);
    }
  }

  function toggle(url: string) {
    setSelected((prev) => (prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]));
  }

  async function importShorts() {
    if (!scanResults || selected.length === 0) return;
    if (!shortsAccepted) return setError("Please confirm you have the right to embed these shorts");
    setImporting(true);
    setError("");
    setScanMsg("");
    try {
      let created = 0;
      let failed = 0;
      for (let i = 0; i < selected.length; i += 10) {
        const chunk = selected.slice(i, i + 10);
        const res = await fetch("/api/videos/import/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            urls: chunk,
            channelName: scanChannel?.name ?? null,
            channelUrl: scanChannel?.url ?? null,
            asShort: true,
          }),
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) {
          failed += chunk.length;
          if (res.status === 429) {
            setError("Import limit reached for this hour. Try again later.");
            break;
          }
          continue;
        }
        created += d.created ?? 0;
        failed += (d.skipped ?? 0) + (d.blocked ?? 0);
      }
      setScanMsg(
        `Imported ${created} short${created === 1 ? "" : "s"}${
          failed > 0 ? `, ${failed} could not be imported` : ""
        }. Videos that were already on BlameTV were skipped automatically.`
      );
      setScanResults(null);
      setChannelInput("");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="mb-2 text-xl font-bold sm:text-2xl">Repost</h1>
      <p className="mb-6 text-sm text-[#aaaaaa]">
        BlameTV works with embeds: paste a link and the video streams straight from the original
        platform. That is why reposting is unlimited and never fills up any storage.
      </p>

      <div className="mb-6 flex gap-2">
        {(
          [
            { id: "video", label: "Single video" },
            { id: "shorts", label: "Channel shorts" },
          ] as const
        ).map((t) => (
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

      {tab === "video" && (
        <form onSubmit={submitLink} className="card space-y-5 p-4 sm:p-6">
          <div>
            <label className="mb-1 block text-sm font-medium">Video link *</label>
            <input
              name="url"
              type="url"
              required
              placeholder="https://www.youtube.com/watch?v=…"
              className="input"
            />
            <p className="mt-1 text-xs text-[#717171]">
              Supported: YouTube, Vimeo, Dailymotion, Twitch, Streamable, TikTok. The video streams
              from the original platform in an embedded player — no storage used.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Category</label>
              <select name="category" className="input">
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Visibility</label>
              <select name="visibility" className="input">
                <option value="PUBLIC">Public</option>
                <option value="UNLISTED">Unlisted</option>
                <option value="PRIVATE">Private</option>
              </select>
            </div>
          </div>
          <p className="text-xs text-[#717171]">
            Title, description and the original creator are filled in automatically from the video
            itself. To add a whole channel or playlist at once, use the{" "}
            <a href="/browse" className="text-[#3ea6ff] underline">Channel browser</a>.
          </p>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              I have the right to embed and share this video, and it complies with the{" "}
              <a href="/legal/guidelines" className="text-[#3ea6ff] underline">Community Guidelines</a>.
            </span>
          </label>

          {error && <p className="text-sm text-[#ff6b6b]">{error}</p>}

          <button type="submit" disabled={importing} className="btn-primary w-full">
            {importing ? "Importing…" : "Repost"}
          </button>
        </form>
      )}

      {tab === "shorts" && (
        <div className="card space-y-5 p-4 sm:p-6">
          <div>
            <h2 className="text-sm font-semibold">Scan a channel for shorts</h2>
            <p className="mt-1 text-xs text-[#717171]">
              Enter a YouTube channel name, @handle, or URL. BlameTV looks at the channel&apos;s
              Shorts tab only — regular long videos are ignored.
            </p>
          </div>
          <form onSubmit={scanShorts} className="flex flex-col gap-2 sm:flex-row">
            <input
              value={channelInput}
              onChange={(e) => setChannelInput(e.target.value)}
              placeholder="@handle or channel URL"
              className="input flex-1"
            />
            <button type="submit" disabled={scanning} className="btn-primary">
              {scanning ? "Scanning…" : "Scan shorts"}
            </button>
          </form>

          {scanResults && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-[#aaaaaa]">
                  {scanResults.length} shorts found · {selected.length} selected
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setSelected(scanResults.map((v) => v.url))} className="btn px-3 py-1 text-xs">
                    Select all
                  </button>
                  <button type="button" onClick={() => setSelected([])} className="btn px-3 py-1 text-xs">
                    Clear
                  </button>
                </div>
              </div>
              <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                {scanResults.map((v) => (
                  <label
                    key={v.url}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#272727] p-2 transition-colors hover:bg-[#1c1c1c]"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(v.url)}
                      onChange={() => toggle(v.url)}
                      className="h-4 w-4 shrink-0 accent-[#3ea6ff]"
                    />
                    <span className="h-11 w-20 shrink-0 overflow-hidden rounded-md bg-[#272727]">
                      {v.thumbnail && (
                        <img src={v.thumbnail} alt="" className="h-full w-full object-cover" />
                      )}
                    </span>
                    <span className="min-w-0 break-words text-sm">{v.title}</span>
                  </label>
                ))}
              </div>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={shortsAccepted}
                  onChange={(e) => setShortsAccepted(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  I have the right to embed these shorts on BlameTV, or they are licensed for reuse.
                </span>
              </label>
              {error && <p className="text-sm text-[#ff6b6b]">{error}</p>}
              <button
                type="button"
                onClick={importShorts}
                disabled={importing || selected.length === 0}
                className="btn-primary w-full"
              >
                {importing ? "Importing…" : `Import ${selected.length} shorts`}
              </button>
            </>
          )}

          {scanMsg && <p className="text-sm text-[#7ddf9a]">{scanMsg}</p>}
          {!scanResults && error && <p className="text-sm text-[#ff6b6b]">{error}</p>}
        </div>
      )}
    </div>
  );
}
