"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Report = {
  id: string;
  reason: string;
  details: string;
  status: string;
  createdAt: string;
  video: { id: string; title: string } | null;
  reporter: { username: string };
};

type AdminUser = {
  id: string;
  username: string;
  displayName: string;
  role: string;
  createdAt: string;
  _count: { videos: number; comments: number };
};

export default function AdminPage() {
  const [data, setData] = useState<{
    reports: Report[];
    stats: { videoCount: number; userCount: number; commentCount: number; openReports: number };
  } | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/reports")
      .then(async (r) => {
        if (r.status === 401 || r.status === 403) {
          setError("Admin access required");
          return null;
        }
        return r.json();
      })
      .then((d) => d && setData(d))
      .catch(() => setError("Failed to load"));

    fetch("/api/admin/users")
      .then(async (r) => (r.ok ? r.json() : null))
      .then((d) => d && setUsers(d.users))
      .catch(() => {});
  }, []);

  async function resolve(id: string, status: string) {
    await fetch(`/api/admin/reports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setData((d) =>
      d ? { ...d, reports: d.reports.map((r) => (r.id === id ? { ...r, status } : r)) } : d
    );
  }

  async function takedown(report: Report) {
    if (!confirm("Delete the reported content permanently?")) return;
    const res = await fetch(`/api/admin/reports/${report.id}`, { method: "DELETE" });
    if (res.ok) {
      setData((d) => (d ? { ...d, reports: d.reports.filter((r) => r.id !== report.id) } : d));
    }
  }

  async function setRole(userId: string, role: string) {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    if (res.ok) setUsers((us) => us.map((u) => (u.id === userId ? { ...u, role } : u)));
  }

  if (error) return <p className="p-8 text-sm text-[#ff6b6b]">{error}</p>;
  if (!data) return <p className="p-8 text-sm text-[#aaaaaa]">Loading…</p>;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-bold">Admin panel</h1>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          ["Videos", String(data.stats.videoCount)],
          ["Users", String(data.stats.userCount)],
          ["Comments", String(data.stats.commentCount)],
          ["Open reports", String(data.stats.openReports)],
        ].map(([label, value]) => (
          <div key={label} className="card p-4">
            <p className="text-xs text-[#aaaaaa]">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-4 text-lg font-semibold">Reports</h2>
      {data.reports.length === 0 ? (
        <p className="mb-8 text-sm text-[#aaaaaa]">No reports. 🎉</p>
      ) : (
        <div className="mb-8 space-y-3">
          {data.reports.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-full bg-[#272727] px-2 py-0.5 text-xs font-medium">{r.reason}</span>
                <span
                  className={`text-xs ${
                    r.status === "OPEN"
                      ? "text-[#ffb84d]"
                      : r.status === "RESOLVED"
                        ? "text-[#3ea6ff]"
                        : "text-[#aaaaaa]"
                  }`}
                >
                  {r.status}
                </span>
                <span className="text-xs text-[#aaaaaa]">
                  by @{r.reporter.username} · {new Date(r.createdAt).toLocaleString()}
                </span>
              </div>
              {r.video && (
                <p className="mt-2 text-sm">
                  Video:{" "}
                  <Link href={`/watch/${r.video.id}`} className="text-[#3ea6ff] hover:underline">
                    {r.video.title}
                  </Link>
                </p>
              )}
              {r.details && <p className="mt-1 text-sm text-[#aaaaaa]">{r.details}</p>}
              <div className="mt-3 flex gap-2">
                <button onClick={() => resolve(r.id, "RESOLVED")} className="btn-ghost !py-1 text-xs">
                  Mark resolved
                </button>
                <button onClick={() => resolve(r.id, "DISMISSED")} className="btn-ghost !py-1 text-xs">
                  Dismiss
                </button>
                <button onClick={() => takedown(r)} className="btn-ghost !py-1 text-xs !text-[#ff6b6b]">
                  Delete content
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="mb-4 text-lg font-semibold">Users</h2>
      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.id} className="card flex flex-wrap items-center gap-3 p-3 text-sm">
            <span className="font-semibold">{u.displayName}</span>
            <span className="text-[#aaaaaa]">@{u.username}</span>
            <span className="text-xs text-[#aaaaaa]">
              {u._count.videos} videos · {u._count.comments} comments
            </span>
            <span
              className={`ml-auto rounded-full px-2 py-0.5 text-xs ${
                u.role === "ADMIN" ? "bg-[#4d3a10] text-[#ffb84d]" : "bg-[#272727] text-[#aaaaaa]"
              }`}
            >
              {u.role}
            </span>
            <button
              onClick={() => setRole(u.id, u.role === "ADMIN" ? "USER" : "ADMIN")}
              className="btn-ghost !py-1 text-xs"
            >
              {u.role === "ADMIN" ? "Demote" : "Make admin"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
