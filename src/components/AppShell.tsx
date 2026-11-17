"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { DialogProvider } from "@/components/dialogs";
import WelcomeModal from "@/components/WelcomeModal";
import type { SessionUser, StashedAccount } from "@/lib/auth";

const ICON_PATHS: Record<string, string> = {
  home: "M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75",
  upload:
    "M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5",
  repost:
    "M16.023 9.348h4.992V4.356m0 4.992l-3.181-3.183a8.25 8.25 0 00-13.803 3.7M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7",
  refresh:
    "M16.023 9.348h4.992V4.356m0 4.992l-3.181-3.183a8.25 8.25 0 00-13.803 3.7M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7",
  history: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z",
  playlists:
    "M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z",
  studio:
    "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z",
  settings:
    "M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281zM15 12a3 3 0 11-6 0 3 3 0 016 0z",
  admin:
    "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z",
  about:
    "M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z",
  menu: "M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5",
  search:
    "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z",
  browse:
    "M12 21a9 9 0 100-18 9 9 0 000 18zM14.8 9.2l-1.7 4-4 1.6 1.7-4 4-1.6z",
  subs:
    "M6 4.5v11.25A2.25 2.25 0 008.25 18h7.5a2.25 2.25 0 002.25-2.25V4.5M3 4.5v11.25A4.5 4.5 0 007.5 20.25h9a4.5 4.5 0 004.5-4.5V4.5M10.5 9l3 2.25-3 2.25V9z",
  shorts:
    "M8.25 3.75h7.5A2.25 2.25 0 0118 6v12a2.25 2.25 0 01-2.25 2.25h-7.5A2.25 2.25 0 016 18V6a2.25 2.25 0 012.25-2.25zM11.5 9.2l3.2 2.3-3.2 2.3V9.2z",
  play: "M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z",
};

function Icon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}

type NavItem = { href: string; label: string; icon: string };

const MAIN_NAV: NavItem[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/shorts", label: "Shorts", icon: "shorts" },
  { href: "/subscriptions", label: "Subscriptions", icon: "subs" },
];

const LIBRARY_NAV: NavItem[] = [
  { href: "/upload", label: "Repost", icon: "repost" },
  { href: "/browse", label: "Browse channels", icon: "browse" },
  { href: "/history", label: "History", icon: "history" },
  { href: "/playlists", label: "Playlists", icon: "playlists" },
  { href: "/studio", label: "Studio", icon: "studio" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

const EXTRA_NAV: NavItem[] = [{ href: "/about", label: "About", icon: "about" }];

function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <Link href="/" onClick={onClick} className="flex items-center gap-2 shrink-0">
      <img src="/blametv-logo.png" alt="BlameTV logo" className="h-9 w-9" />
      <span className="hidden text-lg font-bold tracking-tight sm:inline">BlameTV</span>
      <span className="rounded-full bg-[#3ea6ff]/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#3ea6ff]">Beta</span>
    </Link>
  );
}

function RefreshButton() {
  const [spinning, setSpinning] = useState(false);
  return (
    <button
      type="button"
      aria-label="Refresh page"
      title="Refresh"
      onClick={() => {
        if (spinning) return;
        setSpinning(true);
        window.location.reload();
      }}
      className="rounded-full p-2 text-[#aaaaaa] transition-colors hover:bg-[#272727] hover:text-white"
    >
      <Icon name="refresh" className={`h-5 w-5 ${spinning ? "animate-spin" : ""}`} />
    </button>
  );
}

function SidebarContent({
  user,
  onNavigate,
}: {
  user: SessionUser | null;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  function item(item: NavItem) {
    const active = pathname === item.href;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-150 ${
          active
            ? "bg-[#272727] font-medium text-white"
            : "text-[#aaaaaa] hover:bg-[#1f1f1f] hover:text-white"
        }`}
      >
        <Icon name={item.icon} />
        {item.label}
      </Link>
    );
  }

  return (
    <nav className="flex flex-col gap-1 px-3 py-4">
      {MAIN_NAV.map(item)}
      {user && (
        <>
          <p className="mt-4 px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-[#717171]">
            Library
          </p>
          {LIBRARY_NAV.map(item)}
          {user.role === "ADMIN" && item({ href: "/admin", label: "Admin panel", icon: "admin" })}
        </>
      )}
      <div className="my-3 border-t border-[#272727]" />
      {EXTRA_NAV.map(item)}
      <button
        type="button"
        onClick={() => {
          window.dispatchEvent(new Event("blametv:welcome"));
          onNavigate?.();
        }}
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[#aaaaaa] transition-colors duration-150 hover:bg-[#1f1f1f] hover:text-white"
      >
        <Icon name="about" />
        What is BlameTV?
      </button>
      {!user && (
        <p className="mt-4 px-3 text-xs leading-5 text-[#717171]">
          Sign in to add videos, build playlists and get a personalized feed.
        </p>
      )}
      <div className="mt-6 px-3">
        <span
          title="BlameTV shows no advertisements and never will"
          className="inline-flex items-center gap-1.5 rounded-full border border-[#272727] px-2.5 py-1 text-[11px] font-semibold tracking-wide text-[#aaaaaa]"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3 w-3"
            aria-hidden="true"
          >
            <path d="M4 12l5 5L20 6" />
          </svg>
          NO ADS
        </span>
      </div>
    </nav>
  );
}

export default function AppShell({
  user,
  accounts = [],
  children,
}: {
  user: SessionUser | null;
  accounts?: StashedAccount[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sug, setSug] = useState<{
    videos: { id: string; title: string; thumbnailUrl: string | null }[];
    users: { username: string; displayName: string; avatarUrl: string | null }[];
  } | null>(null);
  const [sugOpen, setSugOpen] = useState(false);
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

  useEffect(() => {
    const q = query.trim();
    const t = setTimeout(() => {
      if (q.length < 2) {
        setSug(null);
        return;
      }
      fetch(`/api/search/suggest?q=${encodeURIComponent(q)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setSug(d))
        .catch(() => {});
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  function go(path: string) {
    setSugOpen(false);
    setQuery("");
    setSug(null);
    router.push(path);
  }

  function switchTo(username: string) {
    setMenuOpen(false);
    fetch("/api/auth/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    }).then(() => window.location.assign("/"));
  }

  function forgetAccount(username: string) {
    fetch("/api/auth/accounts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    }).then(() => router.refresh());
  }

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
    <DialogProvider>
      <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center gap-3 bg-[#0f0f0f]/95 px-4 backdrop-blur">
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          className="rounded-full p-2 text-[#aaaaaa] transition-colors hover:bg-[#272727] hover:text-white lg:hidden"
        >
          <Icon name="menu" />
        </button>
        <Logo />
        <RefreshButton />
        <Link
          href="/search"
          aria-label="Search"
          className="ml-auto rounded-full p-2 text-[#aaaaaa] transition-colors hover:bg-[#272727] hover:text-white sm:hidden"
        >
          <Icon name="search" />
        </Link>
        <div className="relative mx-auto hidden w-full max-w-xl sm:block">
          <form onSubmit={search} className="flex">
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSugOpen(true);
              }}
              onFocus={() => setSugOpen(true)}
              onBlur={() => setTimeout(() => setSugOpen(false), 150)}
              onKeyDown={(e) => e.key === "Escape" && setSugOpen(false)}
              placeholder="Search videos and people"
              maxLength={100}
              className="w-full rounded-l-full border border-[#303030] bg-[#121212] px-4 py-1.5 text-sm outline-none transition-colors focus:border-[#3ea6ff]"
            />
            <button
              type="submit"
              aria-label="Search"
              className="rounded-r-full border border-l-0 border-[#303030] bg-[#222222] px-4 text-[#aaaaaa] transition-colors hover:bg-[#303030] hover:text-white"
            >
              <Icon name="search" className="h-4 w-4" />
            </button>
          </form>
          {sugOpen && sug && (sug.users.length > 0 || sug.videos.length > 0) && (
            <div className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-[#303030] bg-[#212121] py-1 shadow-2xl">
              {sug.users.map((u) => (
                <button
                  key={`u-${u.username}`}
                  type="button"
                  onMouseDown={() => go(`/channel/${u.username}`)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-[#272727]"
                >
                  <span className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[#3d3d3d]">
                    {u.avatarUrl && <img src={u.avatarUrl} alt="" className="h-full w-full object-cover" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{u.displayName}</span>
                    <span className="block truncate text-xs text-[#aaaaaa]">@{u.username} · Channel</span>
                  </span>
                </button>
              ))}
              {sug.videos.map((v) => (
                <button
                  key={`v-${v.id}`}
                  type="button"
                  onMouseDown={() => go(`/watch/${v.id}`)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-[#272727]"
                >
                  <span className="relative block h-9 w-16 shrink-0 overflow-hidden rounded bg-[#3d3d3d]">
                    {v.thumbnailUrl && <img src={v.thumbnailUrl} alt="" className="h-full w-full object-cover" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm">{v.title}</span>
                    <span className="block text-xs text-[#aaaaaa]">Video</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {user ? (
            <>
              <Link href="/upload" className="btn-ghost !py-1.5 text-xs">
                <Icon name="repost" className="h-4 w-4" />
                <span className="hidden sm:inline">Repost</span>
              </Link>
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-label="Account menu"
                  className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#3ea6ff] text-sm font-bold text-black transition-transform hover:scale-105"
                >
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    user.displayName.charAt(0).toUpperCase()
                  )}
                </button>
                {menuOpen && (
                  <div className="anim-fade-in absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-[#272727] bg-[#212121] py-2 shadow-xl">
                    <div className="border-b border-[#272727] px-4 py-2">
                      <p className="truncate text-sm font-medium">{user.displayName}</p>
                      <p className="truncate text-xs text-[#aaaaaa]">@{user.username}</p>
                    </div>
                    {[
                      { href: `/channel/${user.username}`, label: "Your channel" },
                      { href: "/studio", label: "Studio & analytics" },
                      { href: "/history", label: "Watch history" },
                      { href: "/playlists", label: "Playlists" },
                      { href: "/settings", label: "Settings" },
                      ...(user.role === "ADMIN"
                        ? [{ href: "/admin", label: "Admin panel" }]
                        : []),
                    ].map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={`block px-4 py-2 text-sm transition-colors hover:bg-[#2f2f2f] ${
                          link.label === "Admin panel" ? "text-[#ffb84d]" : ""
                        }`}
                        onClick={() => setMenuOpen(false)}
                      >
                        {link.label}
                      </Link>
                    ))}
                    {accounts.length > 0 && (
                      <div className="border-t border-[#272727] px-4 py-2">
                        <p className="mb-1 text-xs uppercase tracking-wider text-[#717171]">
                          Switch account
                        </p>
                        {accounts.map((a) => (
                          <div key={a.username} className="flex items-center gap-1 py-0.5">
                            <button
                              onClick={() => switchTo(a.username)}
                              className="flex min-w-0 flex-1 items-center gap-2 rounded-lg p-1 text-left transition-colors hover:bg-[#2f2f2f]"
                            >
                              <span className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-[#3d3d3d]">
                                {a.avatarUrl ? (
                                  <img src={a.avatarUrl} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <span className="flex h-full w-full items-center justify-center text-xs font-bold">
                                    {a.displayName.charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate text-sm">{a.displayName}</span>
                                <span className="block truncate text-xs text-[#aaaaaa]">@{a.username}</span>
                              </span>
                            </button>
                            <button
                              onClick={() => forgetAccount(a.username)}
                              aria-label={`Forget ${a.username}`}
                              className="shrink-0 rounded-full px-1.5 text-[#717171] transition-colors hover:text-[#ff6b6b]"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <Link
                      href="/login"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-[#3ea6ff] transition-colors hover:bg-[#2f2f2f]"
                    >
                      Add account
                    </Link>
                    <div className="border-t border-[#272727]" />
                    <button
                      onClick={logout}
                      className="block w-full px-4 py-2 text-left text-sm transition-colors hover:bg-[#2f2f2f]"
                    >
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

      <aside className="fixed bottom-0 left-0 top-14 z-40 hidden w-60 overflow-y-auto border-r border-[#272727] bg-[#0f0f0f] lg:block">
        <SidebarContent user={user} />
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div
            className="anim-fade-in absolute inset-0 bg-black/60"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="anim-slide-in absolute bottom-0 left-0 top-0 w-64 overflow-y-auto border-r border-[#272727] bg-[#0f0f0f]">
            <div className="flex h-14 items-center px-4">
              <Logo onClick={() => setDrawerOpen(false)} />
            </div>
            <SidebarContent user={user} onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <main className="min-h-screen pt-14 lg:pl-60">
        <div key={pathname} className="anim-page">
          {children}
        </div>
        <footer className="mt-16 border-t border-[#272727] px-6 py-8 text-xs text-[#717171]">
          <div className="mx-auto flex max-w-6xl flex-wrap gap-x-6 gap-y-2">
            <a href="/legal/terms" className="transition-colors hover:text-[#f1f1f1]">
              Terms of Service
            </a>
            <a href="/legal/privacy" className="transition-colors hover:text-[#f1f1f1]">
              Privacy Policy
            </a>
            <a href="/legal/dmca" className="transition-colors hover:text-[#f1f1f1]">
              Copyright / DMCA
            </a>
            <a href="/legal/guidelines" className="transition-colors hover:text-[#f1f1f1]">
              Community Guidelines
            </a>
            <a href="/about" className="transition-colors hover:text-[#f1f1f1]">
              How BlameTV works
            </a>
            <span className="ml-auto">&copy; {new Date().getFullYear()} BlameTV</span>
          </div>
        </footer>
      </main>
      <WelcomeModal />
    </DialogProvider>
  );
}
