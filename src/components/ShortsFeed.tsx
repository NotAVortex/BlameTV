"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatViews } from "@/components/VideoCard";

type ShortItem = {
  id: string;
  title: string;
  embedUrl: string | null;
  views: number;
  sourceChannel: string | null;
  sourceChannelUrl: string | null;
  owner: { username: string; displayName: string };
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
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);
  const iframes = useRef(new Map<number, HTMLIFrameElement>());
  const activeRef = useRef(0);

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

  if (initial.length === 0) return null;

  return (
    <div className="h-[calc(100dvh-3.5rem)] snap-y snap-mandatory overflow-y-scroll overscroll-contain">
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
                  src={`${v.embedUrl}?enablejsapi=1&rel=0`}
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
