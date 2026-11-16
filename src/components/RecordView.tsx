"use client";

import { useEffect } from "react";

export default function RecordView({ videoId }: { videoId: string }) {
  useEffect(() => {
    const key = `viewed:${videoId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    fetch(`/api/videos/${videoId}/view`, { method: "POST" }).catch(() => {});
  }, [videoId]);
  return null;
}
