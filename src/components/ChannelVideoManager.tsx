"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import VideoCard, { type VideoCardData } from "@/components/VideoCard";
import { useDialogs } from "@/components/dialogs";

export default function ChannelVideoManager({
  videos,
}: {
  videos: VideoCardData[];
}) {
  const router = useRouter();
  const dialogs = useDialogs();
  const [managing, setManaging] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState("");

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function deleteSelected() {
    const ids = Array.from(selected);
    const confirmed = await dialogs.confirm({
      title: `Delete ${ids.length} video${ids.length === 1 ? "" : "s"}?`,
      message:
        "This permanently removes the selected videos, their files from storage, and all comments, likes and hypes on them. This cannot be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!confirmed) return;
    setDeleting(true);
    setMsg("");
    let done = 0;
    for (const id of ids) {
      try {
        const res = await fetch(`/api/videos/${id}`, { method: "DELETE" });
        if (res.ok) done += 1;
      } catch {
        /* keep going — report the count at the end */
      }
    }
    setDeleting(false);
    setSelected(new Set());
    setManaging(false);
    setMsg(`Deleted ${done} of ${ids.length} videos.`);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold">Videos</h2>
        {!managing ? (
          <button
            type="button"
            onClick={() => {
              setManaging(true);
              setMsg("");
            }}
            className="btn bg-[#272727] px-3 py-1 text-xs hover:bg-[#3f3f3f]"
          >
            Manage videos
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() =>
                setSelected(
                  selected.size === videos.length
                    ? new Set()
                    : new Set(videos.map((v) => v.id)),
                )
              }
              className="btn bg-[#272727] px-3 py-1 text-xs hover:bg-[#3f3f3f]"
            >
              {selected.size === videos.length ? "Deselect all" : "Select all"}
            </button>
            <button
              type="button"
              onClick={deleteSelected}
              disabled={selected.size === 0 || deleting}
              className="btn bg-[#cc0000] px-3 py-1 text-xs font-medium text-white hover:bg-[#ff0000] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleting
                ? "Deleting…"
                : `Delete selected (${selected.size})`}
            </button>
            <button
              type="button"
              onClick={() => {
                setManaging(false);
                setSelected(new Set());
              }}
              className="btn bg-[#272727] px-3 py-1 text-xs hover:bg-[#3f3f3f]"
            >
              Done
            </button>
            <span className="text-xs text-[#aaaaaa]">
              Tick the videos you want to remove, then delete them in one go.
            </span>
          </>
        )}
        {msg && <span className="text-xs text-[#3ea6ff]">{msg}</span>}
      </div>

      <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {videos.map((v) => (
          <div key={v.id} className="relative">
            {managing && (
              <button
                type="button"
                onClick={() => toggle(v.id)}
                aria-label={selected.has(v.id) ? "Deselect video" : "Select video"}
                className={`absolute left-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-md border-2 transition-colors ${
                  selected.has(v.id)
                    ? "border-[#cc0000] bg-[#cc0000] text-white"
                    : "border-white/70 bg-black/60 hover:bg-black/80"
                }`}
              >
                {selected.has(v.id) && (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path d="M4 12l5 5L20 6" />
                  </svg>
                )}
              </button>
            )}
            <div className={managing && selected.has(v.id) ? "opacity-60" : ""}>
              <VideoCard video={v} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
