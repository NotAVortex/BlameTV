"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import VideoCard, { type VideoCardData } from "@/components/VideoCard";

type FeedItem = VideoCardData & { reason?: string };

export default function HomeFeed({ initial }: { initial: FeedItem[] }) {
  const [items, setItems] = useState<FeedItem[]>(initial);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const res = await fetch("/api/feed");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.videos) && data.videos.length > 0) {
          setItems((prev) => [...prev, ...data.videos]);
        }
      }
    } catch {
      /* network hiccup — the observer will retry on the next intersection */
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void loadMore();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <>
      <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((v, i) => (
          <div key={`${v.id}-${i}`}>
            <VideoCard video={v} />
            {v.reason && <p className="mt-1 text-[11px] text-[#717171]">{v.reason}</p>}
          </div>
        ))}
      </div>
      <div ref={sentinelRef} className="h-4" />
      {loading && (
        <div className="flex justify-center py-6">
          <span
            className="h-7 w-7 animate-spin rounded-full border-2 border-[#3f3f3f] border-t-[#aaaaaa]"
            aria-hidden="true"
          />
        </div>
      )}
    </>
  );
}
