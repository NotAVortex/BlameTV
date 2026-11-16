"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDuration } from "@/components/VideoCard";

type Playlist = {
  id: string;
  name: string;
  createdAt: string;
  items: { video: { id: string; title: string; thumbnailUrl: string | null; durationSec: number } }[];
};

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [state, setState] = useState<"loading" | "ready">("loading");
  const [name, setName] = useState("");

  useEffect(() => {
    fetch("/api/me/playlists")
      .then(async (r) => {
        if (r.status === 401) {
          window.location.href = "/login";
          return;
        }
        const d = await r.json();
        setPlaylists(d.playlists ?? []);
        setState("ready");
      })
      .catch(() => setState("ready"));
  }, []);

  async function create() {
    if (!name.trim()) return;
    const res = await fetch("/api/me/playlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setName("");
      const d = await fetch("/api/me/playlists").then((r) => r.json());
      setPlaylists(d.playlists ?? []);
    }
  }

  async function removePlaylist(id: string) {
    if (!confirm("Delete this playlist?")) return;
    const res = await fetch(`/api/me/playlists?id=${id}`, { method: "DELETE" });
    if (res.ok) setPlaylists((p) => p.filter((x) => x.id !== id));
  }

  async function removeVideo(playlistId: string, videoId: string) {
    await fetch("/api/me/playlists", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playlistId, videoId, action: "remove" }),
    });
    setPlaylists((ps) =>
      ps.map((p) =>
        p.id === playlistId
          ? { ...p, items: p.items.filter((i) => i.video.id !== videoId) }
          : p
      )
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-bold">Your playlists</h1>

      <div className="mb-8 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New playlist name"
          maxLength={80}
          className="input max-w-xs"
        />
        <button onClick={create} className="btn-primary">Create</button>
      </div>

      {state === "loading" && <p className="text-sm text-[#aaaaaa]">Loading…</p>}
      {state === "ready" && playlists.length === 0 && (
        <p className="text-sm text-[#aaaaaa]">
          No playlists yet — create one above, or save videos from any watch page.
        </p>
      )}

      <div className="space-y-8">
        {playlists.map((p) => (
          <div key={p.id} className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">
                {p.name}{" "}
                <span className="text-xs font-normal text-[#aaaaaa]">({p.items.length} videos)</span>
              </h2>
              <button
                onClick={() => removePlaylist(p.id)}
                className="btn-ghost !py-1 text-xs !text-[#ff6b6b]"
              >
                Delete playlist
              </button>
            </div>
            {p.items.length === 0 ? (
              <p className="text-xs text-[#aaaaaa]">Empty playlist.</p>
            ) : (
              <div className="space-y-2">
                {p.items.map((i) => (
                  <div key={i.video.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-[#212121]">
                    <Link href={`/watch/${i.video.id}`} className="h-12 w-20 shrink-0 overflow-hidden rounded bg-[#212121]">
                      {i.video.thumbnailUrl ? (
                        <img src={i.video.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center">🎬</div>
                      )}
                    </Link>
                    <Link href={`/watch/${i.video.id}`} className="line-clamp-1 flex-1 text-sm hover:underline">
                      {i.video.title}
                    </Link>
                    <span className="text-xs text-[#aaaaaa]">{formatDuration(i.video.durationSec)}</span>
                    <button
                      onClick={() => removeVideo(p.id, i.video.id)}
                      className="btn-ghost !px-2 !py-1 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
