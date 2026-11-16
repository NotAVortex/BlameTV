"use client";

import { useState, useEffect } from "react";
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

  useEffect(() => {
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
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setBannerFile(f);
              preview(f, setBannerPreview);
            }}
            className="input mt-2 file:mr-3 file:rounded-full file:border-0 file:bg-[#3f3f3f] file:px-4 file:py-1 file:text-sm file:text-white"
          />
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
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setAvatarFile(f);
              preview(f, setAvatarPreview);
            }}
            className="input mt-2 file:mr-3 file:rounded-full file:border-0 file:bg-[#3f3f3f] file:px-4 file:py-1 file:text-sm file:text-white"
          />
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
    </div>
  );
}
