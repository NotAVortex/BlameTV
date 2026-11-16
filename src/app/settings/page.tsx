"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDialogs } from "@/components/dialogs";

type Me = {
  email: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  role: string;
  accentColor: string | null;
  bgFrom: string | null;
  bgTo: string | null;
  pfpRing: string | null;
  links: string | null;
  hideSubscriptions: boolean;
  createdAt: string;
};

const GRADIENT_PRESETS: [string, string, string][] = [
  ["Sunset", "#ff5f6d", "#ffc371"],
  ["Ocean", "#2193b0", "#6dd5ed"],
  ["Forest", "#134e5e", "#71b280"],
  ["Midnight", "#0f0c29", "#302b63"],
  ["Candy", "#fc466b", "#3f5efb"],
  ["Ember", "#f12711", "#f5af19"],
];

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
  const dialogs = useDialogs();
  const [deletePassword, setDeletePassword] = useState("");
  const [storageOk, setStorageOk] = useState(true);
  const [accentColor, setAccentColor] = useState("");
  const [bgFrom, setBgFrom] = useState("");
  const [bgTo, setBgTo] = useState("");
  const [pfpRing, setPfpRing] = useState("");
  const [hideSubs, setHideSubs] = useState(false);
  const [links, setLinks] = useState<{ label: string; url: string }[]>([]);
  const [crop, setCrop] = useState<{
    kind: "avatar" | "banner";
    src: string;
    name: string;
    iw: number;
    ih: number;
    cover: number;
  } | null>(null);
  const [cropPos, setCropPos] = useState({ x: 0, y: 0 });
  const [cropZoom, setCropZoom] = useState(1);
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);

  const AVATAR_VIEW = 256;
  const BANNER_VIEW = { w: 640, h: 160 };

  function cropView(kind: "avatar" | "banner") {
    return kind === "avatar" ? { w: AVATAR_VIEW, h: AVATAR_VIEW } : BANNER_VIEW;
  }

  function clampPos(x: number, y: number, dw: number, dh: number, view: { w: number; h: number }) {
    const halfX = Math.max(0, (dw - view.w) / 2);
    const halfY = Math.max(0, (dh - view.h) / 2);
    return {
      x: Math.max(-halfX, Math.min(halfX, x)),
      y: Math.max(-halfY, Math.min(halfY, y)),
    };
  }

  function openCrop(file: File, kind: "avatar" | "banner") {
    const src = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const view = cropView(kind);
      const cover = Math.max(view.w / img.naturalWidth, view.h / img.naturalHeight);
      setCrop({ kind, src, name: file.name, iw: img.naturalWidth, ih: img.naturalHeight, cover });
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
    const outW = crop.kind === "avatar" ? 512 : 1280;
    const outH = crop.kind === "avatar" ? 512 : 320;
    const view = cropView(crop.kind);
    const k = outW / view.w;
    const dw = crop.iw * crop.cover * cropZoom * k;
    const dh = crop.ih * crop.cover * cropZoom * k;
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#181818";
    ctx.fillRect(0, 0, outW, outH);
    ctx.drawImage(
      img,
      (view.w / 2 + cropPos.x) * k - dw / 2,
      (view.h / 2 + cropPos.y) * k - dh / 2,
      dw,
      dh
    );
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], crop.kind === "avatar" ? "avatar.png" : "banner.png", {
        type: "image/png",
      });
      if (crop.kind === "avatar") {
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(blob));
      } else {
        setBannerFile(file);
        setBannerPreview(URL.createObjectURL(blob));
      }
      setCrop(null);
    }, "image/png");
  }

  function onCropPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: cropPos.x, baseY: cropPos.y };
  }

  function onCropPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current || !crop) return;
    const view = cropView(crop.kind);
    const next = clampPos(
      dragRef.current.baseX + (e.clientX - dragRef.current.startX),
      dragRef.current.baseY + (e.clientY - dragRef.current.startY),
      crop.iw * crop.cover * cropZoom,
      crop.ih * crop.cover * cropZoom,
      view
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
        setAccentColor(d.user.accentColor ?? "");
        setBgFrom(d.user.bgFrom ?? "");
        setBgTo(d.user.bgTo ?? "");
        setPfpRing(d.user.pfpRing ?? "");
        setHideSubs(Boolean(d.user.hideSubscriptions));
        try {
          setLinks(d.user.links ? JSON.parse(d.user.links) : []);
        } catch {
          setLinks([]);
        }
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
    fd.set("accentColor", accentColor);
    fd.set("bgFrom", bgFrom);
    fd.set("bgTo", bgTo);
    fd.set("pfpRing", pfpRing);
    fd.set("links", JSON.stringify(links));
    fd.set("hideSubscriptions", hideSubs ? "true" : "false");
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
    if (
      !(await dialogs.confirm({
        title: "Delete account",
        message: "Permanently delete your account, videos, comments and all data? This cannot be undone.",
        danger: true,
        confirmLabel: "Delete forever",
      }))
    )
      return;
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
      <h1 className="mb-6 break-words text-xl font-bold sm:text-2xl">Settings</h1>

      <section className="card mb-6 p-6">
        <h2 className="mb-4 text-lg font-semibold">Profile customization</h2>

        <div className="mb-6">
          <p className="mb-2 text-xs text-[#aaaaaa]">
            Banner — static image, or animated GIF / animated WebP up to 10 seconds (max 5 MB)
          </p>
          <div
            className="h-28 w-full rounded-xl bg-gradient-to-r from-[#272727] to-[#3d3d3d] bg-cover bg-center"
            style={
              bannerSrc
                ? { backgroundImage: `url(${bannerSrc})` }
                : bgFrom && bgTo
                  ? { background: `linear-gradient(135deg, ${bgFrom}, ${bgTo})` }
                  : undefined
            }
          />
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={!storageOk}
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              if (!f) return;
              if (f.type === "image/gif") {
                setBannerFile(f);
                preview(f, setBannerPreview);
              } else {
                openCrop(f, "banner");
              }
            }}
            className="input mt-2 file:mr-3 file:rounded-full file:border-0 file:bg-[#3f3f3f] file:px-4 file:py-1 file:text-sm file:text-white disabled:opacity-40"
          />
          <p className="mt-1 text-xs text-[#717171]">
            Static images open a drag-and-zoom editor. Animated GIFs are used as-is.
          </p>
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
          <span
            className="inline-flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[#3d3d3d] break-words text-xl font-bold sm:text-2xl"
            style={pfpRing ? { boxShadow: `0 0 0 3px ${pfpRing}` } : undefined}
          >
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
                openCrop(f, "avatar");
              }
            }}
            className="input mt-2 file:mr-3 file:rounded-full file:border-0 file:bg-[#3f3f3f] file:px-4 file:py-1 file:text-sm file:text-white disabled:opacity-40"
          />
          <p className="mt-1 text-xs text-[#717171]">
            Static images open a drag-and-zoom editor. Animated GIFs are used as-is.
          </p>
        </div>

        <div className="mb-6 rounded-xl border border-[#272727] p-4">
          <p className="mb-1 text-sm font-semibold">Channel style</p>
          <p className="mb-4 text-xs text-[#aaaaaa]">
            Your personal colors, shown on your channel page. The accent colors your buttons, the
            gradient fills the banner area when you have no banner image, and the outline draws a
            ring around your profile picture. Previews update live above.
          </p>
          <div className="space-y-4">
            <div>
              <p className="mb-1 text-xs text-[#aaaaaa]">Accent color</p>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={accentColor || "#3ea6ff"}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded border border-[#272727] bg-transparent"
                  aria-label="Accent color"
                />
                <button type="button" onClick={() => setAccentColor("")} className="btn px-3 py-1 text-xs">
                  No accent
                </button>
                {accentColor && <span className="text-xs text-[#aaaaaa]">{accentColor}</span>}
              </div>
            </div>

            <div>
              <p className="mb-1 text-xs text-[#aaaaaa]">Background gradient</p>
              <div className="mb-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setBgFrom("");
                    setBgTo("");
                  }}
                  className={`h-8 rounded-lg border px-3 text-xs ${
                    !bgFrom && !bgTo ? "border-[#f1f1f1]" : "border-[#272727]"
                  }`}
                >
                  None
                </button>
                {GRADIENT_PRESETS.map(([name, from, to]) => (
                  <button
                    key={name}
                    type="button"
                    title={name}
                    onClick={() => {
                      setBgFrom(from);
                      setBgTo(to);
                    }}
                    className={`h-8 w-14 rounded-lg border transition-transform duration-200 hover:scale-105 ${
                      bgFrom === from && bgTo === to ? "border-[#f1f1f1]" : "border-[#272727]"
                    }`}
                    style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={bgFrom || "#0f0f0f"}
                  onChange={(e) => setBgFrom(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded border border-[#272727] bg-transparent"
                  aria-label="Gradient start"
                />
                <span className="text-xs text-[#aaaaaa]">to</span>
                <input
                  type="color"
                  value={bgTo || "#3d3d3d"}
                  onChange={(e) => setBgTo(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded border border-[#272727] bg-transparent"
                  aria-label="Gradient end"
                />
              </div>
            </div>

            <div>
              <p className="mb-1 text-xs text-[#aaaaaa]">Profile picture outline</p>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={pfpRing || "#ff3b3b"}
                  onChange={(e) => setPfpRing(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded border border-[#272727] bg-transparent"
                  aria-label="Profile picture outline"
                />
                <button type="button" onClick={() => setPfpRing("")} className="btn px-3 py-1 text-xs">
                  No outline
                </button>
              </div>
            </div>

            <div>
              <p className="mb-1 text-xs text-[#aaaaaa]">
                Profile links (up to 5) — shown on your channel page. Must start with https://
              </p>
              <div className="space-y-2">
                {links.map((l, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={l.label}
                      onChange={(e) =>
                        setLinks((prev) =>
                          prev.map((x, j) => (j === i ? { ...x, label: e.target.value } : x))
                        )
                      }
                      placeholder="Label (e.g. My website)"
                      maxLength={50}
                      className="input w-36 shrink-0 sm:w-44"
                    />
                    <input
                      value={l.url}
                      onChange={(e) =>
                        setLinks((prev) =>
                          prev.map((x, j) => (j === i ? { ...x, url: e.target.value } : x))
                        )
                      }
                      placeholder="https://example.com/you"
                      maxLength={300}
                      className="input flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => setLinks((prev) => prev.filter((_, j) => j !== i))}
                      className="btn-ghost !px-2 !py-1 text-xs !text-[#ff6b6b]"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              {links.length < 5 && (
                <button
                  type="button"
                  onClick={() => setLinks((prev) => [...prev, { label: "", url: "" }])}
                  className="btn mt-2 px-3 py-1 text-xs"
                >
                  Add link
                </button>
              )}
            </div>

            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={hideSubs}
                onChange={(e) => setHideSubs(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#3ea6ff]"
              />
              <span>
                Hide my subscriber count on my channel page. Other people will not see the number.
              </span>
            </label>
          </div>
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
          <div
            className={`card w-full space-y-4 p-5 ${
              crop.kind === "banner" ? "max-w-2xl" : "max-w-sm"
            }`}
          >
            <h3 className="text-lg font-semibold">
              {crop.kind === "banner" ? "Adjust banner" : "Adjust profile picture"}
            </h3>
            <div
              className={`relative mx-auto cursor-grab overflow-hidden bg-[#212121] active:cursor-grabbing ${
                crop.kind === "banner" ? "rounded-xl" : "rounded-full"
              }`}
              style={{ width: cropView(crop.kind).w, height: cropView(crop.kind).h }}
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
                  width: crop.iw * crop.cover,
                  height: crop.ih * crop.cover,
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
                  const view = cropView(crop.kind);
                  setCropPos((p) =>
                    clampPos(p.x, p.y, crop.iw * crop.cover * z, crop.ih * crop.cover * z, view)
                  );
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
