"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { originalWatchUrl } from "@/lib/embed";
import { useDialogs } from "@/components/dialogs";

function ThumbIcon({ down = false }: { down?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
      style={down ? { transform: "rotate(180deg)" } : undefined}
    >
      <path d="M7 10v11H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h3zm0 0l4.2-7.4a1.8 1.8 0 0 1 3.3 1.2L13.8 8H19a2 2 0 0 1 2 2.4l-1.6 8A2 2 0 0 1 17.4 20H7" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 19h16" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M14 5l7 7-7 7m7-7H8a4 4 0 00-4 4v2" />
    </svg>
  );
}

function HypeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M4.5 16.5c-1.5 1.5-2 5-2 5s3.5-.5 5-2c.8-.8.8-2.2 0-3-.8-.8-2.2-.8-3 0zM12 15l-3-3c.9-2.3 2.4-4.5 4-6 3-3 7-4 9-2 .8-2.5 0-5 0-5s-2.5-.8-5 0c2-2 5-2 5-2s0 3-2 5c1.5 2 .5 6-2 9-1.5 1.6-3.7 3.1-6 4z" />
    </svg>
  );
}

export default function WatchActions({
  videoId,
  initialLikes,
  initialDislikes,
  initialMyLike,
  isOwner,
  loggedIn,
  videoUrl,
  embedUrl,
  initialHypeCount,
  initialMyHype,
}: {
  videoId: string;
  initialLikes: number;
  initialDislikes: number;
  initialMyLike: number;
  isOwner: boolean;
  loggedIn: boolean;
  videoUrl: string | null;
  embedUrl: string | null;
  initialHypeCount: number;
  initialMyHype: boolean;
}) {
  const router = useRouter();
  const dialogs = useDialogs();
  const [likes, setLikes] = useState(initialLikes);
  const [dislikes, setDislikes] = useState(initialDislikes);
  const [myLike, setMyLike] = useState(initialMyLike);
  const [hypeCount, setHypeCount] = useState(initialHypeCount);
  const [myHype, setMyHype] = useState(initialMyHype);
  const [msg, setMsg] = useState("");
  const [showReport, setShowReport] = useState(false);
  const [reason, setReason] = useState("SPAM");
  const [details, setDetails] = useState("");
  const [showSave, setShowSave] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [savePlaylists, setSavePlaylists] = useState<
    { id: string; name: string; items: { video: { id: string } }[] }[]
  >([]);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const original = embedUrl ? originalWatchUrl(embedUrl) : null;

  async function like(value: 1 | -1) {
    if (!loggedIn) return router.push("/login");
    const next = myLike === value ? 0 : value;
    const res = await fetch(`/api/videos/${videoId}/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: next }),
    });
    if (res.ok) {
      const data = await res.json();
      setLikes(data.likes);
      setDislikes(data.dislikes);
      setMyLike(next);
    }
  }

  async function hype() {
    if (!loggedIn) return router.push("/login");
    const res = await fetch(`/api/videos/${videoId}/hype`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setHypeCount(data.count);
      setMyHype(data.hyped);
    }
  }

  async function saveToPlaylist() {
    if (!loggedIn) return router.push("/login");
    setSaveBusy(true);
    try {
      const res = await fetch("/api/me/playlists");
      const data = await res.json().catch(() => ({}));
      setSavePlaylists(data.playlists ?? []);
      setNewPlaylistName("");
      setShowSave(true);
    } finally {
      setSaveBusy(false);
    }
  }

  function inPlaylist(p: { items: { video: { id: string } }[] }) {
    return p.items.some((i) => i.video.id === videoId);
  }

  async function togglePlaylist(id: string) {
    const current = savePlaylists.find((p) => p.id === id);
    if (!current) return;
    const adding = !inPlaylist(current);
    const res = await fetch("/api/me/playlists", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playlistId: id,
        videoId,
        action: adding ? "add" : "remove",
      }),
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      setSavePlaylists((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                items:
                  data.added === false
                    ? p.items.filter((i) => i.video.id !== videoId)
                    : [...p.items, { video: { id: videoId } }],
              }
            : p
        )
      );
      setMsg(adding ? "Added to playlist" : "Removed from playlist");
    }
  }

  async function createPlaylistAndSave(e: React.FormEvent) {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    const res = await fetch("/api/me/playlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newPlaylistName.trim(), videoId }),
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      setSavePlaylists((prev) => [
        { id: data.id, name: newPlaylistName.trim(), items: [{ video: { id: videoId } }] },
        ...prev,
      ]);
      setNewPlaylistName("");
      setMsg("Saved to playlist");
    }
  }

  async function share() {
    const url = `${window.location.origin}/watch/${videoId}`;
    try {
      if (navigator.share) {
        await navigator.share({ url, title: document.title });
        return;
      }
      await navigator.clipboard.writeText(url);
      setMsg("Link copied to clipboard");
    } catch {
      try {
        const input = document.createElement("textarea");
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
        setMsg("Link copied to clipboard");
      } catch {
        setMsg(url);
      }
    }
  }

  async function submitReport() {
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, details, videoId }),
    });
    setShowReport(false);
    setMsg(res.ok ? "Report submitted — our team will review it." : "Report failed");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center overflow-hidden rounded-full bg-[#272727]">
        <button
          onClick={() => like(1)}
          className={`px-4 py-2 text-sm hover:bg-[#3f3f3f] ${myLike === 1 ? "text-[#3ea6ff]" : ""}`}
        >
          <ThumbIcon /> {likes}
        </button>
        <span className="h-6 w-px bg-[#3f3f3f]" />
        <button
          onClick={() => like(-1)}
          className={`px-4 py-2 text-sm hover:bg-[#3f3f3f] ${myLike === -1 ? "text-[#ff6b6b]" : ""}`}
        >
          <ThumbIcon down /> {dislikes}
        </button>
        {!isOwner && (
          <>
            <span className="h-6 w-px bg-[#3f3f3f]" />
            <button
              onClick={hype}
              title="Hype pushes this video up the Hyped section on the home page. You cannot hype your own video."
              className={`px-4 py-2 text-sm hover:bg-[#3f3f3f] ${myHype ? "text-[#ffb84d]" : ""}`}
            >
              <span className="flex items-center gap-2">
                <HypeIcon /> {hypeCount}
              </span>
            </button>
          </>
        )}
      </div>

      <button
        onClick={share}
        title="Copy the link to this video so you can paste it anywhere — chat apps show the thumbnail and title automatically"
        className="btn-ghost"
      >
        <span className="flex items-center gap-2">
          <ShareIcon /> Share
        </span>
      </button>
      <button onClick={saveToPlaylist} disabled={saveBusy} className="btn-ghost">
        ＋ Save
      </button>
      {!isOwner && (
        <button
          onClick={() => (loggedIn ? setShowReport(true) : router.push("/login"))}
          className="btn-ghost"
        >
          ⚑ Report
        </button>
      )}
      {videoUrl ? (
        <a href={`/api/videos/${videoId}/download`} className="btn-ghost">
          <span className="flex items-center gap-2">
            <DownloadIcon /> Download
          </span>
        </a>
      ) : embedUrl && original ? (
        <a
          href={original}
          target="_blank"
          rel="noopener noreferrer"
          title="Embedded videos play from the original platform, so BlameTV cannot offer a direct download. Use the original platform's own download option if it has one."
          className="btn-ghost"
        >
          <span className="flex items-center gap-2">
            <DownloadIcon /> Open original
          </span>
        </a>
      ) : null}
      {msg && <span className="text-xs text-[#3ea6ff]">{msg}</span>}

      {showSave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="card w-full max-w-md p-6">
            <h3 className="mb-1 text-lg font-semibold">Save to playlist</h3>
            <p className="mb-4 text-xs text-[#aaaaaa]">
              Click a playlist to add or remove this video.
            </p>
            <div className="mb-4 max-h-64 space-y-1 overflow-y-auto">
              {savePlaylists.length === 0 ? (
                <p className="py-4 text-sm text-[#aaaaaa]">
                  No playlists yet — create your first one below.
                </p>
              ) : (
                savePlaylists.map((p) => {
                  const added = inPlaylist(p);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePlaylist(p.id)}
                      className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors ${
                        added
                          ? "border-[#1f4a2a] bg-[#122417] hover:border-[#2a6b3a]"
                          : "border-[#272727] hover:bg-[#1c1c1c]"
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{p.name}</span>
                        <span className="text-xs text-[#aaaaaa]">{p.items.length} videos</span>
                      </span>
                      <span
                        className={`shrink-0 text-xs font-medium ${
                          added ? "text-[#7ddf9a]" : "text-[#3ea6ff]"
                        }`}
                      >
                        {added ? "Saved — click to remove" : "Add"}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
            <form onSubmit={createPlaylistAndSave} className="flex gap-2">
              <input
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                maxLength={80}
                placeholder="New playlist name"
                className="input flex-1"
              />
              <button type="submit" disabled={!newPlaylistName.trim()} className="btn-primary">
                Create
              </button>
            </form>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setShowSave(false)} className="btn-ghost">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {showReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="card w-full max-w-md p-6">
            <h3 className="mb-4 text-lg font-semibold">Report video</h3>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className="input mb-3">
              <option value="SPAM">Spam or misleading</option>
              <option value="HARASSMENT">Harassment or bullying</option>
              <option value="HATE">Hate speech</option>
              <option value="VIOLENCE">Violent or graphic</option>
              <option value="COPYRIGHT">Copyright infringement</option>
              <option value="MISINFORMATION">Misinformation</option>
              <option value="OTHER">Other</option>
            </select>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Optional details (max 2000 chars)"
              maxLength={2000}
              rows={3}
              className="input mb-4"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowReport(false)} className="btn-ghost">Cancel</button>
              <button onClick={submitReport} className="btn-primary">Submit report</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
