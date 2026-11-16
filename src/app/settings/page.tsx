"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type Me = {
  email: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  role: string;
  createdAt: string;
};

export default function SettingsPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [storageOk, setStorageOk] = useState(true);
  const [crop, setCrop] = useState<{
    src: string;
    name: string;
    iw: number;
    ih: number;
    cover: number;
  } | null>(null);
  const [cropPos, setCropPos] = useState({ x: 0, y: 0 });
  const [cropZoom, setCropZoom] = useState(1);
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);

  const CROP_VIEW = 256;

  function clampPos(x: number, y: number, cover: number, zoom: number) {
    const half = Math.max(0, (CROP_VIEW * cover * zoom - CROP_VIEW) / 2);
    return {
      x: Math.max(-half, Math.min(half, x)),
      y: Math.max(-half, Math.min(half, y)),
    };
  }

  function openCrop(file: File) {
    const src = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const cover = Math.max(CROP_VIEW / img.naturalWidth, CROP_VIEW / img.naturalHeight);
      setCrop({ src, name: file.name, iw: img.naturalWidth, ih: img.naturalHeight, cover });
      setCropPos({ x: 0, y: 0 });
      setCropZoom(1);
    };
    img.src = src;
  }

  async function applyCrop() {
    if (!crop) return;
    const img = new Image();
    img.src = crop.src;
    await img.decode();
    const k = 512 / CROP_VIEW;
    const dw = crop.iw * crop.cover * cropZoom * k;
    const dh = crop.ih * crop.cover * cropZoom * k;
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#181818";
    ctx.fillRect(0, 0, 512, 512);
    ctx.drawImage(
      img,
      (CROP_VIEW / 2 + cropPos.x) * k - dw / 2,
      (CROP_VIEW / 2 + cropPos.y) * k - dh / 2,
      dw,
      dh
    );
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], "avatar.png", { type: "image/png" });
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(blob));
      setCrop(null);
    }, "image/png");
  }

  function onCropPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: cropPos.x, baseY: cropPos.y };
  }

  function onCropPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current || !crop) return;
    const next = clampPos(
      dragRef.current.baseX + (e.clientX - dragRef.current.startX),
      dragRef.current.baseY + (e.clientY - dragRef.current.startY),
      crop.cover,
      cropZoom
    );
    setCropPos(next);
  }

  function onCropPointerUp() {
    dragRef.current = null;
  }

  useEffect(() => {
    fetch("/api/storage/status")
      .then((r) => r.json())
      .then((d) => setStorageOk(Boolean(d.available)))
      .catch(() => {});
    fetch("/api/me")
      .then(async (r) => {
        if (r.status === 401) {
          window.location.href = "/login";
          return;
        }
        const d = await r.json();
        setMe(d.user);
        setDisplayName(d.user.displayName ?? "");
        setBio(d.user.bio ?? "");
      })
      .catch(() => {});
  }, []);

  function preview(file: File | null, setter: (url: string | null) => void) {
    if (!file) return setter(null);
    setter(URL.createObjectURL(file));
  }

  async function saveProfile() {
    setError("");
    setMsg("");
    const fd = new FormData();
    fd.set("displayName", displayName);
    fd.set("bio", bio);
    if (avatarFile) fd.set("avatar", avatarFile);
    if (bannerFile) fd.set("banner", bannerFile);

    const res = await fetch("/api/me", { method: "PATCH", body: fd });
    if (res.ok) {
      setMsg("Profile saved ✓");
      setAvatarFile(null);
      setBannerFile(null);
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Save failed");
    }
  }

  async function exportData() {
    window.location.href = "/api/me/export";
  }

  async function deleteAccount() {
    if (!confirm("Permanently delete your account, videos, comments and all data? This cannot be undone.")) return;
    setError("");
    const res = await fetch("/api/me", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: deletePassword }),
    });
    if (res.ok) {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/";
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Deletion failed");
    }
  }

  if (!me) return <p className="p-8 text-sm text-[#aaaaaa]">Loading…</p>;

  const avatarSrc = avatarPreview ?? me.avatarUrl;
  const bannerSrc = bannerPreview ?? me.bannerUrl;

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-bold">Settings</h1>

      <section className="card mb-6 p-6">
        <h2 className="mb-4 text-lg font-semibold">Profile customization</h2>

        <div className="mb-6">
          <p className="mb-2 text-xs text-[#aaaaaa]">
            Banner — static image, or animated GIF / animated WebP up to 10 seconds (max 5 MB)
          </p>
          <div
            className="h-28 w-full rounded-xl bg-gradient-to-r from-[#272727] to-[#3d3d3d] bg-cover bg-center"
            style={bannerSrc ? { backgroundImage: `url(${bannerSrc})` } : undefined}
          />
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={!storageOk}
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setBannerFile(f);
              preview(f, setBannerPreview);
            }}
            className="input mt-2 file:mr-3 file:rounded-full file:border-0 file:bg-[#3f3f3f] file:px-4 file:py-1 file:text-sm file:text-white disabled:opacity-40"
          />
          {!storageOk && (
            <p className="mt-1 text-xs text-[#ffd97a]">
              Image uploads are not available right now because storage is not connected yet.
            </p>
          )}
        </div>

        <div className="mb-6">
          <p className="mb-2 text-xs text-[#aaaaaa]">
            Profile picture — static image, or animated GIF / animated WebP up to 5 seconds (max 5 MB)
          </p>
          <span className="inline-flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[#3d3d3d] text-2xl font-bold">
            {avatarSrc ? (
              <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
            ) : (
              me.displayName.charAt(0).toUpperCase()
            )}
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={!storageOk}
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              if (!f) return;
              if (f.type === "image/gif") {
                setAvatarFile(f);
                preview(f, setAvatarPreview);
              } else {
                openCrop(f);
              }
            }}
            className="input mt-2 file:mr-3 file:rounded-full file:border-0 file:bg-[#3f3f3f] file:px-4 file:py-1 file:text-sm file:text-white disabled:opacity-40"
          />
          <p className="mt-1 text-xs text-[#717171]">
            Static images open a drag-and-zoom editor. Animated GIFs are used as-is.
          </p>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium">Display name</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={50}
            className="input"
          />
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={1000}
            rows={3}
            className="input"
          />
        </div>

        <p className="mb-4 text-xs text-[#717171]">
          Username (@{me.username}) and email ({me.email}) are permanent and never shown publicly.
        </p>

        {msg && <p className="mb-2 text-sm text-[#3ea6ff]">{msg}</p>}
        {error && <p className="mb-2 text-sm text-[#ff6b6b]">{error}</p>}

        <button onClick={saveProfile} className="btn-primary">Save profile</button>
      </section>

      <section className="card mb-6 p-6">
        <h2 className="mb-2 text-lg font-semibold">Your data</h2>
        <p className="mb-4 text-sm text-[#aaaaaa]">
          Download everything BlameTV stores about you as JSON (GDPR-style export).
        </p>
        <button onClick={exportData} className="btn-ghost">Export my data</button>
      </section>

      <section className="card border-[#5a1f1f] p-6">
        <h2 className="mb-2 text-lg font-semibold !text-[#ff6b6b]">Delete account</h2>
        <p className="mb-4 text-sm text-[#aaaaaa]">
          Permanently deletes your account and all your videos, comments, likes, playlists and
          history. This cannot be undone.
        </p>
        <input
          type="password"
          value={deletePassword}
          onChange={(e) => setDeletePassword(e.target.value)}
          placeholder="Confirm your password"
          className="input mb-3 max-w-xs"
        />
        <button
          onClick={deleteAccount}
          disabled={!deletePassword}
          className="btn !bg-[#5a1f1f] !text-[#ff9b9b] hover:!bg-[#7a2a2a]"
        >
          Delete my account forever
        </button>
      </section>

      {crop && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
          <div className="card w-full max-w-sm space-y-4 p-5">
            <h3 className="text-lg font-semibold">Adjust profile picture</h3>
            <div
              className="relative mx-auto cursor-grab overflow-hidden rounded-full bg-[#212121] active:cursor-grabbing"
              style={{ width: CROP_VIEW, height: CROP_VIEW }}
              onPointerDown={onCropPointerDown}
              onPointerMove={onCropPointerMove}
              onPointerUp={onCropPointerUp}
              onPointerLeave={onCropPointerUp}
            >
              <img
                src={crop.src}
                alt=""
                draggable={false}
                className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
                style={{
                  width: CROP_VIEW * crop.cover,
                  height: "auto",
                  transform: `translate(-50%, -50%) translate(${cropPos.x}px, ${cropPos.y}px) scale(${cropZoom})`,
                }}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#aaaaaa]">Zoom</label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={cropZoom}
                onChange={(e) => {
                  const z = Number(e.target.value);
                  setCropZoom(z);
                  setCropPos((p) => clampPos(p.x, p.y, crop.cover, z));
                }}
                className="w-full accent-[#ff3b3b]"
              />
            </div>
            <p className="text-xs text-[#717171]">Drag to move, slide to zoom.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setCrop(null)} className="btn-ghost">
                Cancel
              </button>
              <button onClick={applyCrop} className="btn-primary">
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
