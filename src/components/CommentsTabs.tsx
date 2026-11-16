"use client";

import { useState } from "react";
import Comments from "@/components/Comments";

type PlatformComment = {
  id: string;
  author: string;
  avatar: string | null;
  time: string | null;
  text: string;
  likes: string | null;
};

export default function CommentsTabs({
  videoId,
  loggedIn,
  myUsername,
  platformLabel,
  platformSupported,
}: {
  videoId: string;
  loggedIn: boolean;
  myUsername?: string;
  platformLabel: string;
  platformSupported: boolean;
}) {
  const [tab, setTab] = useState<"blametv" | "platform">("blametv");
  const [comments, setComments] = useState<PlatformComment[] | null>(null);
  const [state, setState] = useState<
    "idle" | "loading" | "done" | "error" | "unsupported"
  >("idle");

  function openPlatform() {
    setTab("platform");
    if (!platformSupported) {
      setState("unsupported");
      return;
    }
    if (comments || state === "loading") return;
    setState("loading");
    fetch(`/api/videos/${videoId}/platform-comments`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then((d) => {
        setComments(d.comments ?? []);
        setState("done");
      })
      .catch(() => setState("error"));
  }

  return (
    <div>
      <div className="mb-4 flex gap-2 border-b border-[#272727] pb-2">
        <button
          type="button"
          onClick={() => setTab("blametv")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "blametv"
              ? "bg-[#f1f1f1] text-[#0f0f0f]"
              : "bg-[#272727] text-[#aaaaaa] hover:bg-[#3f3f3f]"
          }`}
        >
          BlameTV comments
        </button>
        <button
          type="button"
          onClick={openPlatform}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "platform"
              ? "bg-[#f1f1f1] text-[#0f0f0f]"
              : "bg-[#272727] text-[#aaaaaa] hover:bg-[#3f3f3f]"
          }`}
        >
          {platformLabel} comments
        </button>
      </div>

      {tab === "blametv" ? (
        <Comments videoId={videoId} loggedIn={loggedIn} myUsername={myUsername} />
      ) : state === "loading" ? (
        <div className="flex justify-center py-10">
          <span
            className="h-7 w-7 animate-spin rounded-full border-2 border-[#3f3f3f] border-t-[#aaaaaa]"
            aria-hidden="true"
          />
        </div>
      ) : state === "unsupported" ? (
        <p className="py-6 text-sm text-[#aaaaaa]">
          Comments from {platformLabel} can&apos;t be shown here yet — reading comments
          only works for YouTube imports right now.
        </p>
      ) : state === "error" ? (
        <p className="py-6 text-sm text-[#aaaaaa]">
          Could not load {platformLabel} comments right now. Try again in a moment.
        </p>
      ) : comments && comments.length === 0 ? (
        <p className="py-6 text-sm text-[#aaaaaa]">
          No {platformLabel} comments found for this video.
        </p>
      ) : comments ? (
        <ul className="space-y-5">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#3d3d3d] text-sm font-bold">
                {c.avatar ? (
                  <img src={c.avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  c.author.charAt(0).toUpperCase()
                )}
              </span>
              <div className="min-w-0">
                <p className="text-[13px]">
                  <span className="font-semibold">{c.author}</span>
                  {c.time && (
                    <span className="ml-2 text-[#717171]">{c.time}</span>
                  )}
                </p>
                <p className="whitespace-pre-wrap break-words text-sm">{c.text}</p>
                {c.likes && c.likes !== "0" && (
                  <p className="mt-1 text-xs text-[#717171]">{c.likes} likes</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
