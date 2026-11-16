"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { timeAgo } from "@/components/VideoCard";

type CommentData = {
  id: string;
  body: string;
  createdAt: string;
  author: { username: string; displayName: string; avatarUrl: string | null };
  likes: number;
  replyCount?: number;
  replies?: CommentData[];
};

export default function Comments({
  videoId,
  loggedIn,
  myUsername,
}: {
  videoId: string;
  loggedIn: boolean;
  myUsername?: string;
}) {
  const router = useRouter();
  const [comments, setComments] = useState<CommentData[]>([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  const reload = useCallback(() => {
    fetch(`/api/videos/${videoId}/comments`)
      .then((r) => r.json())
      .then((d) => setComments(d.comments ?? []))
      .catch(() => {});
  }, [videoId]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function post(body: string, parentId?: string | null) {
    if (!loggedIn) return router.push("/login");
    if (!body.trim()) return;
    const res = await fetch(`/api/videos/${videoId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, parentId: parentId ?? undefined }),
    });
    if (res.ok) {
      if (parentId) {
        setReplyText("");
        setReplyTo(null);
      } else {
        setText("");
      }
      reload();
    }
  }

  async function likeComment(id: string) {
    if (!loggedIn) return router.push("/login");
    const res = await fetch(`/api/comments/${id}`, { method: "POST" });
    if (!res.ok) return;
    const data = await res.json();
    const bump = (c: CommentData): CommentData =>
      c.id === id ? { ...c, likes: data.likes } : { ...c, replies: c.replies?.map(bump) };
    setComments((cs) => cs.map(bump));
    setLikedIds((s) => {
      const n = new Set(s);
      if (data.liked) n.add(id);
      else n.delete(id);
      return n;
    });
  }

  async function remove(id: string) {
    if (!confirm("Delete this comment?")) return;
    const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
    if (res.ok) reload();
  }

  function renderComment(c: CommentData, isReply = false, rootId: string | null = null) {
    const threadId = rootId ?? c.id;
    return (
      <div key={c.id} className={`flex gap-3 ${isReply ? "ml-12 mt-3" : "mt-5"}`}>
        <Link
          href={`/channel/${c.author.username}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#3d3d3d] text-sm font-bold transition-transform hover:scale-105"
        >
          {c.author.avatarUrl ? (
            <img src={c.author.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            c.author.displayName.charAt(0).toUpperCase()
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-xs">
            <Link
              href={`/channel/${c.author.username}`}
              className="font-semibold transition-colors hover:text-[#3ea6ff]"
            >
              {c.author.displayName}
            </Link>{" "}
            <span className="text-[#aaaaaa]">{timeAgo(c.createdAt)}</span>
          </p>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm">{c.body}</p>
          <div className="mt-1 flex items-center gap-3 text-xs text-[#aaaaaa]">
            <button
              onClick={() => likeComment(c.id)}
              className={`hover:text-[#f1f1f1] ${likedIds.has(c.id) ? "text-[#3ea6ff]" : ""}`}
            >
              👍 {c.likes}
            </button>
            <button
              onClick={() => {
                setReplyTo(replyTo === c.id ? null : c.id);
                setReplyText("");
              }}
              className="hover:text-[#f1f1f1]"
            >
              Reply
            </button>
            {myUsername === c.author.username && (
              <button onClick={() => remove(c.id)} className="hover:text-[#ff6b6b]">
                Delete
              </button>
            )}
          </div>

          {replyTo === c.id && (
            <div className="mt-2 flex gap-2">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Reply to ${c.author.displayName}…`}
                maxLength={2000}
                className="input !py-1.5"
              />
              <button onClick={() => post(replyText, threadId)} className="btn-primary !py-1.5 text-xs">
                Reply
              </button>
            </div>
          )}

          {c.replies?.map((r) => renderComment(r, true, threadId))}
        </div>
      </div>
    );
  }

  return (
    <section className="mt-8">
      <h2 className="mb-4 text-lg font-semibold">{comments.length} Comments</h2>

      {loggedIn ? (
        <div className="flex gap-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment…"
            maxLength={2000}
            rows={2}
            className="input"
          />
          <button onClick={() => post(text)} className="btn-primary self-start">
            Comment
          </button>
        </div>
      ) : (
        <p className="text-sm text-[#aaaaaa]">
          <a href="/login" className="text-[#3ea6ff] hover:underline">Sign in</a> to comment.
        </p>
      )}

      <div className="pb-8">{comments.map((c) => renderComment(c))}</div>
    </section>
  );
}
