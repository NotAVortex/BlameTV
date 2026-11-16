"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SessionUser } from "@/lib/auth";

export default function Header({ user }: { user: SessionUser | null }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  }

  function search(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center gap-4 bg-[#0f0f0f]/95 px-4 backdrop-blur">
      <Link href="/" className="flex items-center gap-2 shrink-0">
        <img src="/blametv-logo.png" alt="BlameTV logo" className="h-7 w-auto" />
        <span className="text-lg font-bold tracking-tight">BlameTV</span>
      </Link>

      <form onSubmit={search} className="mx-auto flex w-full max-w-xl">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          maxLength={100}
          className="w-full rounded-l-full border border-[#303030] bg-[#121212] px-4 py-1.5 text-sm outline-none focus:border-[#3ea6ff]"
        />
        <button
          type="submit"
          aria-label="Search"
          className="rounded-r-full border border-l-0 border-[#303030] bg-[#222222] px-5 hover:bg-[#303030]"
        >
          🔍
        </button>
      </form>

      <div className="flex shrink-0 items-center gap-2">
        {user ? (
          <>
            <Link href="/upload" className="btn-ghost !py-1.5 text-xs">
              + Upload
            </Link>
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Account menu"
                className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#3ea6ff] text-sm font-bold text-black"
              >
                {user.displayName.charAt(0).toUpperCase()}
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-[#272727] bg-[#212121] py-2 shadow-xl">
                  <div className="border-b border-[#272727] px-4 py-2">
                    <p className="truncate text-sm font-medium">{user.displayName}</p>
                    <p className="truncate text-xs text-[#aaaaaa]">@{user.username}</p>
                  </div>
                  <Link href={`/channel/${user.username}`} className="block px-4 py-2 text-sm hover:bg-[#2f2f2f]" onClick={() => setMenuOpen(false)}>
                    Your channel
                  </Link>
                  <Link href="/studio" className="block px-4 py-2 text-sm hover:bg-[#2f2f2f]" onClick={() => setMenuOpen(false)}>
                    Studio &amp; analytics
                  </Link>
                  <Link href="/history" className="block px-4 py-2 text-sm hover:bg-[#2f2f2f]" onClick={() => setMenuOpen(false)}>
                    Watch history
                  </Link>
                  <Link href="/playlists" className="block px-4 py-2 text-sm hover:bg-[#2f2f2f]" onClick={() => setMenuOpen(false)}>
                    Playlists
                  </Link>
                  <Link href="/settings" className="block px-4 py-2 text-sm hover:bg-[#2f2f2f]" onClick={() => setMenuOpen(false)}>
                    Settings
                  </Link>
                  {user.role === "ADMIN" && (
                    <Link href="/admin" className="block px-4 py-2 text-sm text-[#ffb84d] hover:bg-[#2f2f2f]" onClick={() => setMenuOpen(false)}>
                      Admin panel
                    </Link>
                  )}
                  <button onClick={logout} className="block w-full px-4 py-2 text-left text-sm hover:bg-[#2f2f2f]">
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <Link href="/login" className="btn-ghost border border-[#3ea6ff] !text-[#3ea6ff]">
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
