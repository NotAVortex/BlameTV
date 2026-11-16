"use client";

import { useState, useEffect } from "react";
import { useDialogs } from "@/components/dialogs";

type Locked = {
  id: string;
  channelKey: string;
  name: string;
  avatarUrl: string | null;
  createdAt: string;
};

export default function LockedChannels() {
  const dialogs = useDialogs();
  const [locked, setLocked] = useState<Locked[]>([]);
  const [state, setState] = useState<"loading" | "ready">("loading");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me/locked-channels")
      .then(async (r) => {
        if (r.status === 401) {
          window.location.href = "/login";
          return;
        }
        const d = await r.json();
        if (!cancelled) {
          setLocked(d.locked ?? []);
          setState("ready");
        }
      })
      .catch(() => {
        if (!cancelled) setState("ready");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function lock(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || busy) return;
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const res = await fetch("/api/me/locked-channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setLocked((l) => [d.locked, ...l]);
        setUrl("");
        setMsg(`Locked ${d.locked.name}. Only you can import videos from this channel now.`);
      } else {
        setError(d.error ?? "Could not lock that channel");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function unlock(item: Locked) {
    if (
      !(await dialogs.confirm({
        message: `Unlock ${item.name}? Other people will be able to import videos from this channel again.`,
        danger: true,
        confirmLabel: "Unlock",
      }))
    )
      return;
    const res = await fetch(`/api/me/locked-channels?id=${item.id}`, { method: "DELETE" });
    if (res.ok) setLocked((l) => l.filter((x) => x.id !== item.id));
  }

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <h2 className="text-lg font-semibold">Locked channels</h2>
        <p className="mt-1 text-xs text-[#aaaaaa]">
          A locked YouTube channel can only be imported by you. When someone else tries to import
          videos from it, they get an error. Lock your own channel here so nobody can copy your
          videos into BlameTV before you do.
        </p>

        <form onSubmit={lock} className="mt-4 flex flex-wrap gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Video link, channel URL, or @handle"
            className="input max-w-md flex-1"
          />
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? "Locking..." : "Lock channel"}
          </button>
        </form>
        <p className="mt-2 text-xs text-[#717171]">
          Tip: pasting any video from the channel is the most reliable way — BlameTV finds the
          channel behind it automatically.
        </p>
        {msg && <p className="mt-2 text-xs text-[#7ddf9a]">{msg}</p>}
        {error && <p className="mt-2 text-xs text-[#ff6b6b]">{error}</p>}
      </div>

      {state === "loading" && <p className="text-sm text-[#aaaaaa]">Loading…</p>}
      {state === "ready" && locked.length === 0 && (
        <p className="text-sm text-[#aaaaaa]">You have not locked any channels yet.</p>
      )}

      {locked.length > 0 && (
        <div className="space-y-3">
          {locked.map((item) => (
            <div key={item.id} className="card flex items-center gap-4 p-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#3d3d3d] font-bold">
                {item.avatarUrl ? (
                  <img src={item.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  item.name.replace("@", "").charAt(0).toUpperCase()
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{item.name}</p>
                <p className="truncate text-xs text-[#aaaaaa]">
                  {item.channelKey} · locked · only you can import from it
                </p>
              </div>
              <button
                onClick={() => unlock(item)}
                className="btn-ghost !py-1.5 text-xs !text-[#ff6b6b]"
              >
                Unlock
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
