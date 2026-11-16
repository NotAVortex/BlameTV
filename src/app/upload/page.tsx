"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES } from "@/lib/validation";

export default function UploadPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  async function submitLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!accepted) return setError("Please confirm you have the right to embed this video");
    const form = e.currentTarget;
    const data = new FormData(form);
    setImporting(true);

    const res = await fetch("/api/videos/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: data.get("url"),
        category: data.get("category"),
        visibility: data.get("visibility"),
      }),
    });
    setImporting(false);
    if (res.status === 201) {
      const { id } = await res.json();
      router.push(`/watch/${id}`);
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Import failed");
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="mb-2 text-2xl font-bold">Add a video</h1>
      <p className="mb-6 text-sm text-[#aaaaaa]">
        BlameTV works with embeds: paste a link and the video streams straight from the original
        platform. That is why adding videos is unlimited and never fills up any storage.
      </p>

      <form onSubmit={submitLink} className="card space-y-5 p-6">
        <div>
          <label className="mb-1 block text-sm font-medium">Video link *</label>
          <input
            name="url"
            type="url"
            required
            placeholder="https://www.youtube.com/watch?v=…"
            className="input"
          />
          <p className="mt-1 text-xs text-[#717171]">
            Supported: YouTube, Vimeo, Dailymotion, Twitch, Streamable. The video streams from the
            original platform in an embedded player — no storage used.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Category</label>
            <select name="category" className="input">
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Visibility</label>
            <select name="visibility" className="input">
              <option value="PUBLIC">Public</option>
              <option value="UNLISTED">Unlisted</option>
              <option value="PRIVATE">Private</option>
            </select>
          </div>
        </div>
        <p className="text-xs text-[#717171]">
          Title, description and the original creator are filled in automatically from the video
          itself. To add a whole channel or playlist at once, use the{" "}
          <a href="/browse" className="text-[#3ea6ff] underline">Channel browser</a>.
        </p>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            I have the right to embed and share this video, and it complies with the{" "}
            <a href="/legal/guidelines" className="text-[#3ea6ff] underline">Community Guidelines</a>.
          </span>
        </label>

        {error && <p className="text-sm text-[#ff6b6b]">{error}</p>}

        <button type="submit" disabled={importing} className="btn-primary w-full">
          {importing ? "Importing…" : "Add video"}
        </button>
      </form>
    </div>
  );
}
