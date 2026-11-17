"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatViews } from "@/components/VideoCard";

type ShortItem = {
  id: string;
  title: string;
  embedUrl: string | null;
  views: number;
  sourceChannel: string | null;
  sourceChannelUrl: string | null;
  likes: number;
  dislikes: number;
  myLike: number;
  owner: { username: string; displayName: string; avatarUrl: string | null };
};

export default function ShortsFeed({
  initial,
  loggedIn,
}: {
  initial: ShortItem[];
  loggedIn: boolean;
}) {
  const [items, setItems] = useState<ShortItem[]>(initial);
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);
  const iframes = useRef(new Map<number, HTMLIFrameElement>());
  const activeRef = useRef(0);
  const router = useRouter();

  const appendShuffled = useCallback(() => {
    setItems((prev) => [...prev, ...[...initial].sort(() => Math.random() - 0.5)]);
  }, [initial]);

  function send(iframe: HTMLIFrameElement | undefined, func: string) {
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage(
      JSON.stringify({ event: "command", func, args: [] }),
      "*"
    );
  }

  const play = useCallback((i: number) => {
    send(iframes.current.get(i), "playVideo");
  }, []);

  const pauseAll = useCallback((except = -1) => {
    iframes.current.forEach((iframe, i) => {
      if (i !== except) send(iframe, "pauseVideo");
    });
  }, []);

  function scrollToIndex(i: number) {
    const sections = containerRef.current?.querySelectorAll<HTMLElement>("[data-index]");
    const target = sections?.[i];
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || initial.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting) || loadingRef.current) return;
        loadingRef.current = true;
        appendShuffled();
        setTimeout(() => {
          loadingRef.current = false;
        }, 600);
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [appendShuffled, initial.length]);

  useEffect(() => {
    if (items.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const idx = Number((entry.target as HTMLElement).dataset.index);
          if (Number.isNaN(idx)) continue;
          if (entry.intersectionRatio >= 0.6) {
            activeRef.current = idx;
            setActive(idx);
            pauseAll(idx);
            play(idx);
          }
        }
      },
      { threshold: [0, 0.6, 1] },
    );
    iframes.current.forEach((iframe) => {
      const section = iframe.closest("[data-index]") as HTMLElement | null;
      if (section) observer.observe(section);
    });
    return () => observer.disconnect();
  }, [items.length, play, pauseAll]);

  useEffect(() => {
    function unlock() {
      play(activeRef.current);
    }
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, [play]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        scrollToIndex(Math.min(activeRef.current + 1, items.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        scrollToIndex(Math.max(activeRef.current - 1, 0));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items.length]);

  async function vote(i: number, value: 1 | -1) {
    const post = items[i];
    if (!post) return;
    if (!loggedIn) return router.push("/login");
    const next = post.myLike === value ? 0 : value;
    const res = await fetch(`/api/videos/${post.id}/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: next }),
    });
    if (res.ok) {
      const data = await res.json();
      setItems((prev) =>
        prev.map((p, idx) =>
          p.id === post.id
            ? { ...p, likes: data.likes, dislikes: data.dislikes, myLike: next }
            : p
        )
      );
    }
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    iframes.current.forEach((iframe) => send(iframe, next ? "mute" : "unMute"));
  }

  async function share(post: ShortItem) {
    const url = `${window.location.origin}/watch/${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* clipboard unavailable */
    }
    setCopied(post.id);
    setTimeout(() => setCopied((c) => (c === post.id ? null : c)), 1500);
  }

  if (initial.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="h-[calc(100dvh-3.5rem)] snap-y snap-mandatory overflow-y-scroll overscroll-contain"
    >
      {items.map((v, i) => (
        <div
          key={`${v.id}-${i}`}
          data-index={i}
          className="flex h-full snap-start items-center justify-center py-2"
        >
          <div className="relative flex h-full w-full max-w-[min(100%,32rem)] items-center justify-center">
            <div className="relative h-full w-full overflow-hidden rounded-none bg-black sm:rounded-2xl">
              {v.embedUrl ? (
                <iframe
                  ref={(el) => {
                    if (el) iframes.current.set(i, el);
                    else iframes.current.delete(i);
                  }}
                  src={`${v.embedUrl}?enablejsapi=1&rel=0&playsinline=1`}
                  title={v.title}
                  className="absolute inset-0 h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-[#aaaaaa]">
                  Video unavailable
                </div>
              )}

              <div className="pointer-events-auto absolute bottom-20 left-2 z-10 flex flex-col items-center gap-3 sm:bottom-24 sm:left-3">
                <Link
                  href={`/channel/${v.owner.username}`}
                  title={`Visit ${v.owner.displayName}`}
                  className="h-10 w-10 overflow-hidden rounded-full border-2 border-white/70 bg-[#3d3d3d] shadow-lg transition-transform hover:scale-110"
                >
                  {v.owner.avatarUrl ? (
                    <img src={v.owner.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-sm font-bold text-white">
                      {v.owner.displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </Link>
                <button
                  type="button"
                  onClick={() => vote(i, 1)}
                  aria-label="Like"
                  className={`flex flex-col items-center gap-1 transition-transform hover:scale-110 ${
                    v.myLike === 1 ? "text-[#3ea6ff]" : "text-white"
                  }`}
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 backdrop-blur">
                    <svg viewBox="0 0 24 24" fill={v.myLike === 1 ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} className="h-5 w-5" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75 2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904m10.598-9.75H14.25M5.904 18.5c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 01-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 9.953 4.167 9.5 5 9.5h1.053c.472 0 .745.556.5.96a8.958 8.958 0 00-1.302 4.665c0 1.194.232 2.333.654 3.375z" />
                    </svg>
                  </span>
                  <span className="text-xs font-medium drop-shadow">{v.likes}</span>
                </button>
                <button
                  type="button"
                  onClick={() => vote(i, -1)}
                  aria-label="Dislike"
                  className={`flex flex-col items-center gap-1 transition-transform hover:scale-110 ${
                    v.myLike === -1 ? "text-[#ff6b6b]" : "text-white"
                  }`}
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 backdrop-blur">
                    <svg viewBox="0 0 24 24" fill={v.myLike === -1 ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} className="h-5 w-5 rotate-180" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75 2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904m10.598-9.75H14.25M5.904 18.5c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 01-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 9.953 4.167 9.5 5 9.5h1.053c.472 0 .745.556.5.96a8.958 8.958 0 00-1.302 4.665c0 1.194.232 2.333.654 3.375z" />
                    </svg>
                  </span>
                  <span className="text-xs font-medium drop-shadow">{v.dislikes}</span>
                </button>
                <Link
                  href={`/watch/${v.id}`}
                  aria-label="Comments"
                  title="Comments on BlameTV"
                  className="flex flex-col items-center gap-1 text-white transition-transform hover:scale-110"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 backdrop-blur">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
                    </svg>
                  </span>
                  <span className="text-xs font-medium drop-shadow">Chat</span>
                </Link>
                <button
                  type="button"
                  onClick={() => share(v)}
                  aria-label="Share"
                  className="flex flex-col items-center gap-1 text-white transition-transform hover:scale-110"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 backdrop-blur">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                    </svg>
                  </span>
                  <span className="text-xs font-medium drop-shadow">
                    {copied === v.id ? "Copied" : "Share"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={toggleMute}
                  aria-label={muted ? "Unmute" : "Mute"}
                  className="flex flex-col items-center gap-1 text-white transition-transform hover:scale-110"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 backdrop-blur">
                    {muted ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                      </svg>
                    )}
                  </span>
                  <span className="text-xs font-medium drop-shadow">{muted ? "Off" : "Sound"}</span>
                </button>
              </div>

              <div className="absolute left-2 top-[15%] z-10 flex flex-col gap-2 sm:left-3">
                <button
                  type="button"
                  onClick={() => scrollToIndex(Math.max(active - 1, 0))}
                  disabled={active === 0}
                  aria-label="Previous short"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-all hover:bg-white/25 disabled:opacity-0"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => scrollToIndex(Math.min(active + 1, items.length - 1))}
                  aria-label="Next short"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-all hover:bg-white/25"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
              </div>

              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-4 pb-4 pt-16">
                <Link
                  href={`/watch/${v.id}`}
                  className={`line-clamp-2 text-sm font-semibold text-white drop-shadow hover:underline ${
                    active === i ? "" : "opacity-80"
                  }`}
                >
                  {v.title}
                </Link>
                <p className="mt-1 text-xs text-white/80 drop-shadow">
                  {formatViews(v.views)} views ·{" "}
                  <Link href={`/channel/${v.owner.username}`} className="hover:underline">
                    {v.owner.displayName}
                  </Link>
                  {v.sourceChannel && (
                    <>
                      {" · originally by "}
                      {v.sourceChannelUrl ? (
                        <a
                          href={v.sourceChannelUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {v.sourceChannel}
                        </a>
                      ) : (
                        v.sourceChannel
                      )}
                    </>
                  )}
                </p>
                {!loggedIn && (
                  <p className="mt-1 text-[11px] text-white/60">
                    <Link href="/login" className="text-[#3ea6ff] hover:underline">
                      Log in
                    </Link>{" "}
                    to like, hype and comment.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
      <div ref={sentinelRef} className="h-2" />
    </div>
  );
}
