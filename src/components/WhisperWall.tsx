"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useDialogs } from "@/components/dialogs";
import { timeAgo } from "@/components/VideoCard";

type Whisper = {
  id: string;
  body: string;
  createdAt: string;
  sender: { username: string; displayName: string; avatarUrl: string | null };
};

export default function WhisperWall({
  username,
  loggedIn,
  viewerUsername,
}: {
  username: string;
  loggedIn: boolean;
  viewerUsername: string | null;
}) {
  const dialogs = useDialogs();
  const [whispers, setWhispers] = useState<Whisper[] | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/whispers/${encodeURIComponent(username)}`)
      .then(async (r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setWhispers(d?.whispers ?? []);
      })
      .catch(() => {
        if (!cancelled) setWhispers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [username]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/whispers/${encodeURIComponent(username)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not post the whisper");
        return;
      }
      setWhispers((prev) => [data.whisper, ...(prev ?? [])]);
      setDraft("");
    } finally {
      setSending(false);
    }
  }

  async function remove(id: string) {
    if (
      !(await dialogs.confirm({
        message: "Remove this whisper?",
        danger: true,
        confirmLabel: "Remove",
      }))
    )
      return;
    const res = await fetch(`/api/whispers/id/${id}`, { method: "DELETE" });
    if (res.ok) setWhispers((prev) => (prev ?? []).filter((w) => w.id !== id));
  }

  return (
    <div className="mb-10">
      <h2 className="mb-1 text-lg font-semibold">Whispers</h2>
      <p className="mb-4 text-xs text-[#aaaaaa]">
        Public little notes visitors leave on this channel. Everyone can read them.
      </p>

      {loggedIn ? (
        <form onSubmit={send} className="mb-4 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={500}
            placeholder="Leave a whisper…"
            className="input flex-1"
          />
          <button type="submit" disabled={sending || !draft.trim()} className="btn-primary">
            {sending ? "Sending…" : "Whisper"}
          </button>
        </form>
      ) : (
        <p className="mb-4 text-xs text-[#aaaaaa]">
          <Link href="/login" className="text-[#3ea6ff] hover:underline">
            Log in
          </Link>{" "}
          to leave a whisper.
        </p>
      )}
      {error && <p className="mb-2 text-xs text-[#ff6b6b]">{error}</p>}

      {whispers === null ? null : whispers.length === 0 ? (
        <p className="text-sm text-[#aaaaaa]">No whispers yet. Be the first to say something quiet.</p>
      ) : (
        <div className="space-y-2">
          {whispers.map((w) => (
            <div key={w.id} className="card flex items-start gap-3 p-3">
              <Link
                href={`/channel/${w.sender.username}`}
                className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[#272727]"
              >
                {w.sender.avatarUrl && (
                  <img src={w.sender.avatarUrl} alt="" className="h-full w-full object-cover" />
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-[#aaaaaa]">
                  <Link
                    href={`/channel/${w.sender.username}`}
                    className="font-medium text-[#f1f1f1] hover:underline"
                  >
                    {w.sender.displayName}
                  </Link>{" "}
                  · {timeAgo(w.createdAt)}
                </p>
                <p className="mt-0.5 break-words text-sm">{w.body}</p>
              </div>
              {(viewerUsername === w.sender.username || viewerUsername === username) && (
                <button
                  onClick={() => remove(w.id)}
                  className="btn-ghost !px-2 !py-1 text-xs !text-[#ff6b6b]"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
