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
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);

  const appendShuffled = useCallback(() => {
    setItems((prev) => [...prev, ...[...initial].sort(() => Math.random() - 0.5)]);
  }, [initial]);

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
      { rootMargin: "400px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [appendShuffled, initial.length]);

  if (initial.length === 0) return null;

  return (
    <div className="h-[calc(100vh-13rem)] snap-y snap-mandatory overflow-y-scroll rounded-2xl">
      {items.map((v, i) => (
        <div
          key={`${v.id}-${i}`}
          className="flex h-full snap-start items-center justify-center py-2"
        >
          <div className="flex h-full w-full max-w-[min(100%,22rem)] flex-col">
            <div className="relative flex-1 overflow-hidden rounded-2xl bg-black">
              {v.embedUrl ? (
                <iframe
                  src={v.embedUrl}
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
            </div>
            <div className="px-1 py-3">
              <Link
                href={`/watch/${v.id}`}
                className="line-clamp-2 text-sm font-semibold hover:underline"
              >
                {v.title}
              </Link>
              <p className="mt-1 text-xs text-[#aaaaaa]">
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
                <p className="mt-1 text-[11px] text-[#717171]">
                  <Link href="/login" className="text-[#3ea6ff] hover:underline">
                    Log in
                  </Link>{" "}
                  to like, hype and comment.
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
      <div ref={sentinelRef} className="h-2" />
    </div>
  );
}
