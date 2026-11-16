"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Creator = {
  name: string;
  url: string | null;
  avatar: string | null;
  videoCount: number;
  thumbnail: string | null;
  latest: string;
};

export default function ImportedCreators({
  onImportMore,
}: {
  onImportMore: (creator: Creator) => void;
}) {
  const [q, setQ] = useState("");
  const [creators, setCreators] = useState<Creator[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/browse/creators?q=");
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "Could not load imported creators");
          setCreators([]);
        } else {
          setCreators(data.creators ?? []);
        }
      } catch {
        if (!cancelled) {
          setError("Could not load imported creators");
          setCreators([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async (query: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/browse/creators?q=${encodeURIComponent(query)}`,
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not load imported creators");
        setCreators([]);
      } else {
        setCreators(data.creators ?? []);
      }
    } catch {
      setError("Could not load imported creators");
      setCreators([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function onChange(value: string) {
    setQ(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void load(value), 300);
  }

  return (
    <div>
      <div className="card mb-6 p-6">
        <label className="mb-1 block text-sm font-medium">
          Search imported creators
        </label>
        <input
          value={q}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type part of a creator's name"
          maxLength={100}
          className="input"
        />
        <p className="mt-2 text-xs text-[#aaaaaa]">
          Everyone you have imported videos from, across all platforms. Searching ignores
          capitalization. Click &quot;Import more&quot; to pull in newer uploads from the
          same creator.
        </p>
      </div>

      {error && <p className="mb-4 text-sm text-[#ff6b6b]">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-10">
          <span
            className="h-7 w-7 animate-spin rounded-full border-2 border-[#3f3f3f] border-t-[#aaaaaa]"
            aria-hidden="true"
          />
        </div>
      ) : creators && creators.length === 0 ? (
        <p className="py-6 text-sm text-[#aaaaaa]">
          {q
            ? "No imported creator matches that search."
            : "No imported creators yet. Import videos from a channel first and they will show up here."}
        </p>
      ) : creators ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {creators.map((c) => (
            <div key={c.name} className="card flex items-center gap-4 p-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#3d3d3d] text-lg font-bold">
                {c.avatar || c.thumbnail ? (
                  <img
                    src={c.avatar ?? c.thumbnail ?? ""}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  c.name.charAt(0).toUpperCase()
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{c.name}</p>
                <p className="text-xs text-[#aaaaaa]">
                  {c.videoCount} video{c.videoCount === 1 ? "" : "s"} imported
                </p>
                {c.url && (
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#3ea6ff] hover:underline"
                  >
                    Open original channel
                  </a>
                )}
              </div>
              <button
                type="button"
                onClick={() => onImportMore(c)}
                className="btn bg-[#272727] px-3 py-1.5 text-xs hover:bg-[#3f3f3f]"
              >
                Import more
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
