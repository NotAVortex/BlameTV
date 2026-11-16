"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ImportedCreators from "@/components/ImportedCreators";

type BrowseVideo = { url: string; title: string; thumbnail: string | null };
type BrowseChannel = {
  id: string;
  name: string;
  query: string;
  avatar: string | null;
  platform: string;
};

const PLATFORMS = [
  { id: "youtube", label: "YouTube", placeholder: "Search creators by username" },
  { id: "dailymotion", label: "Dailymotion", placeholder: "Search creators by username" },
  { id: "blametv", label: "BlameTV", placeholder: "Search BlameTV users" },
];

type Step = "search" | "confirm" | "select" | "importing" | "done";

export default function BrowsePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [platform, setPlatform] = useState("youtube");
  const [mode, setMode] = useState<"channel" | "playlist">("channel");
  const [query, setQuery] = useState("");
  const [step, setStep] = useState<Step>("search");
  const [results, setResults] = useState<BrowseChannel[] | null>(null);
  const [pending, setPending] = useState<BrowseChannel | null>(null);
  const [pendingVideos, setPendingVideos] = useState<BrowseVideo[] | null>(null);
  const [confirmRight, setConfirmRight] = useState(false);
  const [confirmPermission, setConfirmPermission] = useState(false);
  const [searching, setSearching] = useState(false);
  const [total, setTotal] = useState(0);
  const [imported, setImported] = useState(0);
  const [failed, setFailed] = useState(0);
  const [error, setError] = useState("");
  const [doneInfo, setDoneInfo] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [mine, setMine] = useState("");
  const [resolving, setResolving] = useState(false);
  const [view, setView] = useState<"import" | "creators">("import");

  useEffect(() => {
    fetch("/api/me")
      .then((r) => {
        if (r.status === 401) {
          window.location.href = "/login";
          return null;
        }
        setReady(true);
        return r.json();
      })
      .catch(() => {});
  }, []);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    await runSearch(query, platform, mode);
  }

  async function runSearch(
    raw: string,
    platformOverride = platform,
    modeOverride = mode,
  ) {
    setError("");
    if (!raw.trim()) return setError("Type a username or search term first");
    setSearching(true);
    setResults(null);

    if (modeOverride === "playlist") {
      const res = await fetch(`/api/browse?playlist=${encodeURIComponent(raw.trim())}`);
      setSearching(false);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(data.error ?? "Playlist lookup failed");
      const list: BrowseVideo[] = data.videos ?? [];
      if (list.length === 0) {
        return setError(
          "No videos found for that playlist. Paste the full playlist URL (it should contain list=...)."
        );
      }
      setPendingVideos(list);
      setPending({
        id: raw.trim(),
        name: `Playlist (${list.length} videos)`,
        query: raw.trim(),
        avatar: list[0]?.thumbnail ?? null,
        platform: "youtube",
      });
      setConfirmRight(false);
      setConfirmPermission(false);
      setStep("confirm");
      return;
    }

    if (platformOverride === "blametv") {
      const res = await fetch(`/api/browse/channels?platform=blametv&q=${encodeURIComponent(raw.trim())}`);
      setSearching(false);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(data.error ?? "Search failed");
      const list: BrowseChannel[] = data.channels ?? [];
      setResults(list);
      if (list.length === 0) setError("No BlameTV users matched that search.");
      return;
    }

    const res = await fetch(`/api/browse/channels?platform=${platformOverride}&q=${encodeURIComponent(raw.trim())}`);
    setSearching(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setError(data.error ?? "Search failed");
    const list: BrowseChannel[] = data.channels ?? [];
    setResults(list);
    if (list.length === 0)
      setError("No creators found. Try a different spelling or search for their exact username.");
  }

  function importMoreFrom(creator: { name: string; url: string | null }) {
    setError("");
    setView("import");
    setPlatform("youtube");
    setMode("channel");
    setResults(null);
    setStep("search");
    const target = creator.url ?? creator.name;
    setQuery(target);
    void runSearch(target, "youtube", "channel");
  }

  async function connectMine(e: React.FormEvent) {
    e.preventDefault();
    const raw = mine.trim();
    if (!raw) return setError("Paste a video link or channel URL first");
    setError("");
    setResolving(true);
    try {
      let pendingChannel: BrowseChannel;
      if (/youtu\.be\/|watch\?v=|\/shorts\//.test(raw)) {
        const res = await fetch(`/api/browse?resolve=video&url=${encodeURIComponent(raw)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return setError(data.error ?? "Could not find your channel from that link");
        const ch = data.channel as
          | { name: string | null; url: string | null; avatar: string | null }
          | undefined;
        if (!ch || (!ch.name && !ch.url)) {
          return setError("Could not find the channel behind that video");
        }
        pendingChannel = {
          id: ch.url ?? raw,
          name: ch.name ?? "Your channel",
          query: ch.url ?? raw,
          avatar: ch.avatar ?? null,
          platform: "youtube",
        };
      } else {
        let query = raw;
        let name = "Your channel";
        const handle =
          /youtube\.com\/@([A-Za-z0-9._-]{3,40})/.exec(raw)?.[1] ??
          /^@([A-Za-z0-9._-]{3,40})$/.exec(raw)?.[1];
        if (handle) {
          query = `@${handle}`;
          name = `@${handle}`;
        } else if (/^https?:\/\//i.test(raw)) {
          try {
            const parsed = new URL(raw);
            if (!/(^|\.)youtube\.com$/.test(parsed.hostname)) {
              return setError("That does not look like a YouTube link");
            }
            query = `https://www.youtube.com${parsed.pathname.replace(
              /\/(videos|featured|shorts|streams|playlists|community|about).*$/,
              ""
            )}`;
          } catch {
            return setError("That does not look like a YouTube link");
          }
        } else if (/^[A-Za-z0-9._-]{3,40}$/.test(raw)) {
          query = `@${raw}`;
          name = `@${raw}`;
        } else {
          return setError("Paste a YouTube video link, a channel URL, or an @handle");
        }
        pendingChannel = { id: query, name, query, avatar: null, platform: "youtube" };
      }
      setPending(pendingChannel);
      setPendingVideos(null);
      setConfirmRight(false);
      setConfirmPermission(false);
      setStep("confirm");
    } finally {
      setResolving(false);
    }
  }

  function toggleVideo(url: string) {
    setSelected((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]
    );
  }

  async function chooseVideos() {
    if (!pending) return;
    setError("");
    if (pendingVideos) {
      setSelected(pendingVideos.map((v) => v.url));
      setStep("select");
      return;
    }
    setLoadingVideos(true);
    try {
      const res = await fetch(
        `/api/browse?platform=${pending.platform}&channel=${encodeURIComponent(pending.query)}`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not fetch the videos for this creator");
        return;
      }
      const fetched = (data.videos ?? []) as BrowseVideo[];
      if (fetched.length === 0) {
        setError(
          "This creator has no public videos to import. Their channel may be empty or their videos may not be public."
        );
        return;
      }
      const ch = data.channel as
        | { name: string | null; url: string | null; avatar: string | null }
        | undefined;
      if (ch) {
        setPending((p) =>
          p
            ? {
                ...p,
                name:
                  p.name.startsWith("@") || p.name === "Your channel"
                    ? ch.name ?? p.name
                    : p.name,
                avatar: p.avatar ?? ch.avatar ?? null,
                query: ch.url ?? p.query,
              }
            : p
        );
      }
      setPendingVideos(fetched);
      setSelected(fetched.map((v) => v.url));
      setStep("select");
    } finally {
      setLoadingVideos(false);
    }
  }

  function pickCreator(c: BrowseChannel) {
    setError("");
    if (c.platform === "blametv") {
      router.push(`/channel/${c.query}`);
      return;
    }
    setPending(c);
    setPendingVideos(null);
    setConfirmRight(false);
    setConfirmPermission(false);
    setStep("confirm");
  }

  async function startImport() {
    if (!pending || !pendingVideos) return;
    const videos = pendingVideos.filter((v) => selected.includes(v.url));
    if (videos.length === 0) return setError("Pick at least one video first");
    setStep("importing");
    setError("");
    setImported(0);
    setFailed(0);

    setTotal(videos.length);
    let created = 0;
    let failedCount = 0;
    const CHUNK = 10;
    for (let i = 0; i < videos.length; i += CHUNK) {
      const chunk = videos.slice(i, i + CHUNK).map((v) => v.url);
      const res = await fetch("/api/videos/import/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urls: chunk,
          channelName: pending.name,
          channelUrl: pending.platform === "youtube" ? pending.query : null,
          channelAvatar: pending.avatar,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        failedCount += chunk.length;
        setFailed(failedCount);
        if (res.status === 429) {
          setError("Import limit reached for this hour. The rest can be imported later.");
          break;
        }
        continue;
      }
      created += data.created ?? 0;
      failedCount += data.skipped ?? 0;
      setFailed(failedCount);
      setImported(created);
    }

    setDoneInfo(`Embedded ${created} of ${videos.length} videos from ${pending.name}.`);
    setStep("done");
    setPending(null);
    setPendingVideos(null);
    setSelected([]);
    setResults(null);
    setQuery("");
    setMine("");
    router.refresh();
  }

  function backToSearch() {
    setStep("search");
    setPending(null);
    setPendingVideos(null);
    setConfirmRight(false);
    setConfirmPermission(false);
    setSelected([]);
    setMine("");
    setError("");
  }

  if (!ready) return null;
  const active = PLATFORMS.find((p) => p.id === platform)!;
  const progress = total > 0 ? Math.round(((imported + failed) / total) * 100) : 0;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="mb-2 text-2xl font-bold">Channel browser</h1>
      <div className="mb-6 flex gap-2">
        <button
          type="button"
          onClick={() => {
            setView("import");
            setError("");
          }}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            view === "import"
              ? "bg-[#f1f1f1] text-[#0f0f0f]"
              : "bg-[#272727] text-[#aaaaaa] hover:bg-[#3f3f3f]"
          }`}
        >
          Import videos
        </button>
        <button
          type="button"
          onClick={() => {
            setView("creators");
            setError("");
          }}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            view === "creators"
              ? "bg-[#f1f1f1] text-[#0f0f0f]"
              : "bg-[#272727] text-[#aaaaaa] hover:bg-[#3f3f3f]"
          }`}
        >
          Imported YouTubers
        </button>
      </div>
      {view === "creators" ? (
        <ImportedCreators onImportMore={importMoreFrom} />
      ) : (
      <>
      <p className="mb-6 text-sm text-[#aaaaaa]">
        Search for a creator on a supported platform, confirm it is the right one, then pick exactly
        which videos to embed. Titles and descriptions are filled in for you.
      </p>

      {step === "search" && (
        <div className="card mb-6 space-y-3 p-6">
          <p className="font-medium">Import your own YouTube channel</p>
          <p className="text-xs text-[#aaaaaa]">
            Paste a link to one of your videos or your channel URL. BlameTV finds your channel,
            lists your uploads, and you choose which ones to embed. Google does not let other sites
            read your YouTube recommendations, so BlameTV never asks for your Google password —
            connecting works by link instead.
          </p>
          <form onSubmit={connectMine} className="flex flex-col gap-2 sm:flex-row">
            <input
              value={mine}
              onChange={(e) => setMine(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... or youtube.com/@you"
              maxLength={300}
              className="input"
            />
            <button type="submit" disabled={resolving} className="btn-primary whitespace-nowrap">
              {resolving ? "Looking up\u2026" : "Find my channel"}
            </button>
          </form>
        </div>
      )}

      {step === "search" && (
        <div className="card mb-6 space-y-4 p-6">
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPlatform(p.id);
                  setMode("channel");
                  setResults(null);
                  setError("");
                }}
                className={`btn ${platform === p.id && mode === "channel" ? "bg-[#f1f1f1] text-[#0f0f0f]" : "bg-[#272727] hover:bg-[#3f3f3f]"}`}
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setMode("playlist");
                setResults(null);
                setError("");
              }}
              className={`btn ${mode === "playlist" ? "bg-[#f1f1f1] text-[#0f0f0f]" : "bg-[#272727] hover:bg-[#3f3f3f]"}`}
            >
              YouTube playlist
            </button>
          </div>

          <form onSubmit={search} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                {mode === "playlist" ? "Playlist link or ID *" : `${active.label} search *`}
              </label>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  mode === "playlist"
                    ? "https://www.youtube.com/playlist?list=..."
                    : active.placeholder
                }
                maxLength={300}
                className="input"
              />
            </div>
            <p className="text-xs text-[#aaaaaa]">
              {mode === "playlist"
                ? "Every public video in the playlist gets embedded, up to 250. You can untick any before importing."
                : "Pick the exact creator from the results. BlameTV never imports anything until you confirm."}
            </p>
            <button type="submit" disabled={searching} className="btn-primary">
              {searching ? "Searching…" : mode === "playlist" ? "Find playlist" : "Search creators"}
            </button>
          </form>
        </div>
      )}

      {error && <p className="mb-4 text-sm text-[#ff6b6b]">{error}</p>}

      {step === "search" && results && results.length > 0 && (
        <div className="card p-6">
          <p className="mb-4 text-sm text-[#aaaaaa]">
            {results.length} result{results.length === 1 ? "" : "s"}. Click the right one.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {results.map((c) => (
              <button
                type="button"
                key={`${c.platform}-${c.id}`}
                onClick={() => pickCreator(c)}
                className="flex items-center gap-3 rounded-xl border border-[#272727] p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[#3f3f3f] hover:bg-[#1c1c1c]"
              >
                <span className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-[#272727]">
                  {c.avatar && <img src={c.avatar} alt="" className="h-full w-full object-cover" />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{c.name}</span>
                  <span className="block truncate text-xs text-[#aaaaaa]">
                    {c.platform === "blametv" ? `@${c.query}` : c.platform} ·{" "}
                    {c.platform === "blametv" ? "Open channel" : "Import all videos"}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "confirm" && pending && (
        <div className="card space-y-4 p-6">
          <div className="flex items-center gap-4">
            <span className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-[#272727]">
              {pending.avatar && <img src={pending.avatar} alt="" className="h-full w-full object-cover" />}
            </span>
            <div>
              <p className="font-semibold">{pending.name}</p>
              <p className="text-xs text-[#aaaaaa]">
                {pendingVideos
                  ? `${pendingVideos.length} videos found in this playlist`
                  : pending.platform === "youtube"
                    ? "YouTube creator"
                    : "Dailymotion creator"}
              </p>
            </div>
          </div>
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={confirmRight}
              onChange={(e) => setConfirmRight(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#3ea6ff]"
            />
            <span>This is the right {pendingVideos ? "playlist" : "creator"}.</span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={confirmPermission}
              onChange={(e) => setConfirmPermission(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#3ea6ff]"
            />
            <span>
              I have permission to embed this{" "}
              {pendingVideos ? "playlist" : "creator's content"} on BlameTV, or it is licensed for
              reuse. I understand BlameTV only embeds the original player and hosts no video files.
            </span>
          </label>
          <div className="flex gap-2">
            <button
              onClick={chooseVideos}
              disabled={!confirmRight || !confirmPermission || loadingVideos}
              className="btn-primary"
            >
              {loadingVideos ? "Loading videos\u2026" : "Choose videos"}
            </button>
            <button onClick={backToSearch} className="btn">
              Back
            </button>
          </div>
        </div>
      )}

      {step === "select" && pending && pendingVideos && (
        <div className="card space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{pending.name}</p>
              <p className="text-xs text-[#aaaaaa]">
                {pendingVideos.length} video{pendingVideos.length === 1 ? "" : "s"} found ·{" "}
                {selected.length} selected
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelected(pendingVideos.map((v) => v.url))}
                className="btn px-3 py-1 text-xs"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={() => setSelected([])}
                className="btn px-3 py-1 text-xs"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {pendingVideos.map((v) => (
              <label
                key={v.url}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#272727] p-2 transition-colors hover:bg-[#1c1c1c]"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(v.url)}
                  onChange={() => toggleVideo(v.url)}
                  className="h-4 w-4 shrink-0 accent-[#3ea6ff]"
                />
                <span className="h-11 w-20 shrink-0 overflow-hidden rounded-md bg-[#272727]">
                  {v.thumbnail && (
                    <img src={v.thumbnail} alt="" className="h-full w-full object-cover" />
                  )}
                </span>
                <span className="min-w-0 truncate text-sm">{v.title}</span>
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={startImport}
              disabled={selected.length === 0}
              className="btn-primary"
            >
              Import {selected.length} selected
            </button>
            <button onClick={backToSearch} className="btn">
              Back
            </button>
          </div>
        </div>
      )}

      {step === "importing" && (
        <div className="card space-y-4 p-6">
          <p className="font-medium">Embedding videos…</p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#272727]">
            <div
              className="h-full rounded-full bg-[#3ea6ff] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-[#aaaaaa]">
            Embedding {imported + failed} / {total || "…"} · {imported} done
            {failed > 0 ? ` · ${failed} skipped` : ""}
          </p>
          <p className="text-xs text-[#aaaaaa]">
            Keep this page open. Large channels can take a minute because every title is fetched
            from the original platform.
          </p>
        </div>
      )}

      {step === "done" && (
        <div className="rounded-xl border border-[#1f4a2a] bg-[#122417] p-6">
          <p className="font-medium text-[#7ddf9a]">{doneInfo}</p>
          <div className="mt-4 flex gap-3">
            <Link href="/" className="btn-primary">
              Go to your videos
            </Link>
            <button onClick={backToSearch} className="btn">
              Import another creator
            </button>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}
