"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "blametv_welcome_seen";

const FEATURES = [
  {
    title: "Ad-free streaming",
    body: "Every video on BlameTV plays with zero advertisements, no trackers and no interruptions. Nothing is ever sponsored or promoted.",
    icon: (
      <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 19h16" />
    ),
  },
  {
    title: "Unlimited uploads",
    body: "Videos are embedded from YouTube, Vimeo, Dailymotion, Twitch and Streamable, so they stream from the original platform. Add as many as you want — there is no storage limit to hit.",
    icon: (
      <path d="M12 21V9m0 0l-4 4m4-4l4 4M4 5h16" />
    ),
  },
  {
    title: "Community interactions",
    body: "Like, dislike, comment and reply, hype the best videos onto the home page, subscribe to people and build playlists. No account needed to watch.",
    icon: (
      <path d="M20.8 8.6a5.5 5.5 0 00-9.8-3.4 5.5 5.5 0 00-9.8 3.4c0 6 9.8 11 9.8 11s9.8-5 9.8-11z" />
    ),
  },
];

export default function WelcomeModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let seen = true;
    try {
      seen = !!window.localStorage.getItem(STORAGE_KEY);
    } catch {
      /* private mode — just do not auto-open */
    }
    if (seen) return;
    const t = setTimeout(() => setOpen(true), 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const reopen = () => setOpen(true);
    window.addEventListener("blametv:welcome", reopen);
    return () => window.removeEventListener("blametv:welcome", reopen);
  }, []);

  function close() {
    setOpen(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
      <div className="card anim-fade-in w-full max-w-lg p-6">
        <div className="mb-4 flex items-center gap-3">
          <img src="/blametv-logo.png" alt="" className="h-10 w-10" />
          <div>
            <h2 className="text-lg font-bold">Welcome to BlameTV</h2>
            <p className="text-xs text-[#aaaaaa]">
              A free, ad-free video community. Here is what makes it different:
            </p>
          </div>
        </div>

        <ul className="space-y-4">
          {FEATURES.map((f) => (
            <li key={f.title} className="flex gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#272727]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 text-[#3ea6ff]"
                  aria-hidden="true"
                >
                  {f.icon}
                </svg>
              </span>
              <span>
                <span className="block text-sm font-semibold">{f.title}</span>
                <span className="block text-xs leading-5 text-[#aaaaaa]">{f.body}</span>
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-5 text-xs leading-5 text-[#717171]">
          Watching works without an account. Sign in to add videos, comment, subscribe and build
          your own library. You can read this anytime with the{" "}
          <strong className="text-[#aaaaaa]">What is BlameTV?</strong> button in the sidebar.
        </p>

        <button onClick={close} className="btn-primary mt-5 w-full">
          Start watching
        </button>
      </div>
    </div>
  );
}
