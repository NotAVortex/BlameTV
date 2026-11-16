"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES } from "@/lib/validation";

export default function UploadPage() {
  const router = useRouter();
  const [storageOk, setStorageOk] = useState(true);
  const [mode, setMode] = useState<"file" | "link">("file");

  useEffect(() => {
    fetch("/api/storage/status")
      .then((r) => r.json())
      .then((d) => {
        if (!d.available) {
          setStorageOk(false);
          setMode("link");
        }
      })
      .catch(() => {});
  }, []);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function submitFile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const form = e.currentTarget;
    const videoFile = fileRef.current?.files?.[0];
    if (!videoFile) return setError("Choose a video file first");
    if (!accepted) return setError("Please confirm you own the rights to this video");

    const data = new FormData(form);
    data.set("video", videoFile);
    const thumb = form.elements.namedItem("thumbnail") as HTMLInputElement;
    if (thumb.files?.[0]) data.set("thumbnail", thumb.files[0]);

    const xhr = new XMLHttpRequest();
    setUploading(true);
    xhr.open("POST", "/api/videos");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      setUploading(false);
      if (xhr.status === 201) {
        router.push(`/watch/${JSON.parse(xhr.responseText).id}`);
      } else {
        try {
          setError(JSON.parse(xhr.responseText).error ?? "Upload failed");
        } catch {
          setError(`Upload failed (${xhr.status})`);
        }
      }
    };
    xhr.onerror = () => {
      setUploading(false);
      setError("Network error during upload");
    };
    xhr.send(data);
  }

  async function submitLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!accepted) return setError("Please confirm you have the right to embed this video");
    const form = e.currentTarget;
    const data = new FormData(form);
    setUploading(true);

    const res = await fetch("/api/videos/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: data.get("url"),
        title: data.get("title"),
        description: data.get("description"),
        category: data.get("category"),
        tags: data.get("tags"),
        visibility: data.get("visibility"),
      }),
    });
    setUploading(false);
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
      <h1 className="mb-4 text-2xl font-bold">Add a video</h1>

      {storageOk ? null : (
        <div className="mb-6 rounded-xl border border-[#5a4a1f] bg-[#2a2312] px-4 py-3 text-sm text-[#ffd97a]">
          File uploads are not available right now because video storage is not connected yet.
          You can still add videos by importing them from YouTube, Vimeo and other platforms with
          a link.
        </div>
      )}

      <div className="mb-6 flex gap-2">
        <button
          onClick={() => storageOk && setMode("file")}
          disabled={!storageOk}
          className={`btn ${mode === "file" && storageOk ? "bg-[#f1f1f1] text-[#0f0f0f]" : "bg-[#272727] hover:bg-[#3f3f3f]"} ${!storageOk ? "cursor-not-allowed opacity-40" : ""}`}
        >
          Upload file
        </button>
        <button
          onClick={() => setMode("link")}
          className={`btn ${mode === "link" ? "bg-[#f1f1f1] text-[#0f0f0f]" : "bg-[#272727] hover:bg-[#3f3f3f]"}`}
        >
          Import from link
        </button>
      </div>

      {mode === "file" ? (
        <form onSubmit={submitFile} className="card space-y-5 p-6">
          <div>
            <label className="mb-1 block text-sm font-medium">Video file *</label>
            <input
              ref={fileRef}
              type="file"
              accept="video/mp4,video/webm,video/ogg,video/quicktime"
              required
              className="input file:mr-3 file:rounded-full file:border-0 file:bg-[#3f3f3f] file:px-4 file:py-1 file:text-sm file:text-white"
            />
            <p className="mt-1 text-xs text-[#717171]">MP4, WebM, OGG or MOV. Max size set by the server.</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Thumbnail (optional)</label>
            <input
              type="file"
              name="thumbnail"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="input file:mr-3 file:rounded-full file:border-0 file:bg-[#3f3f3f] file:px-4 file:py-1 file:text-sm file:text-white"
            />
          </div>

          <MetaFields />

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              I confirm I own the rights to this content or have permission to upload it, and that
              it complies with the{" "}
              <a href="/legal/guidelines" className="text-[#3ea6ff] underline">Community Guidelines</a>{" "}
              and{" "}
              <a href="/legal/dmca" className="text-[#3ea6ff] underline">Copyright Policy</a>.
            </span>
          </label>

          {uploading && (
            <div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#272727]">
                <div className="h-full bg-[#ff3b3b] transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-1 text-xs text-[#aaaaaa]">{progress}% — do not close this page</p>
            </div>
          )}

          {error && <p className="text-sm text-[#ff6b6b]">{error}</p>}

          <button type="submit" disabled={uploading} className="btn-primary w-full">
            {uploading ? "Uploading…" : "Publish"}
          </button>
        </form>
      ) : (
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
            Title and description are filled in automatically from the video itself.
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

          <button type="submit" disabled={uploading} className="btn-primary w-full">
            {uploading ? "Importing…" : "Add video"}
          </button>
        </form>
      )}
    </div>
  );
}

function MetaFields() {
  return (
    <>
      <div>
        <label className="mb-1 block text-sm font-medium">Title *</label>
        <input name="title" required maxLength={140} className="input" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Description</label>
        <textarea name="description" maxLength={5000} rows={4} className="input" />
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

      <div>
        <label className="mb-1 block text-sm font-medium">Tags (comma separated)</label>
        <input name="tags" maxLength={500} className="input" placeholder="funny, cats, vlog" />
      </div>
    </>
  );
}
