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
    const name = await dialogs.prompt({
      title: "Save to playlist",
      message: "Name a playlist. A new one is created if the name does not exist yet.",
      placeholder: "Playlist name",
      submitLabel: "Save",
    });
    if (!name) return;
    const created = await fetch("/api/me/playlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, videoId }),
    });
    if (created.ok) setMsg("Saved to playlist ✓");
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
      </div>

      {!isOwner && (
        <button
          onClick={hype}
          title="Hype pushes this video up the Hyped section on the home page. You cannot hype your own video."
          className={`btn-ghost ${myHype ? "!text-[#ffb84d]" : ""}`}
        >
          <span className="flex items-center gap-2">
            <HypeIcon /> {hypeCount}
          </span>
        </button>
      )}
      <button onClick={saveToPlaylist} className="btn-ghost">
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
