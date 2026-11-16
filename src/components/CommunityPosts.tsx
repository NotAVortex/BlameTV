"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { timeAgo } from "@/components/VideoCard";
import { useDialogs } from "@/components/dialogs";

type PostComment = {
  id: string;
  body: string;
  createdAt: string;
  author: { username: string; displayName: string; avatarUrl: string | null };
};

type Post = {
  id: string;
  body: string;
  createdAt: string;
  author: { username: string; displayName: string; avatarUrl: string | null };
  likes: number;
  dislikes: number;
  myVote: number;
  comments: PostComment[];
};

export default function CommunityPosts({
  username,
  loggedIn,
  isOwner,
  isAdmin,
  accentColor,
  viewerUsername,
}: {
  username: string;
  loggedIn: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  accentColor: string | null;
  viewerUsername: string | null;
}) {
  const dialogs = useDialogs();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [openComments, setOpenComments] = useState<string[]>([]);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/community/${username}`)
      .then(async (r) => {
        const d = await r.json();
        if (!cancelled) setPosts(d.posts ?? []);
      })
      .catch(() => {
        if (!cancelled) setPosts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [username]);

  async function createPost(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/community/${username}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setPosts((p) => [d.post, ...(p ?? [])]);
        setBody("");
      } else {
        setError(d.error ?? "Could not post");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function vote(post: Post, value: number) {
    if (!loggedIn) return;
    const next = post.myVote === value ? 0 : value;
    const res = await fetch(`/api/community/posts/${post.id}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: next }),
    });
    if (res.ok) {
      const d = await res.json();
      setPosts((ps) =>
        (ps ?? []).map((p) =>
          p.id === post.id ? { ...p, likes: d.likes, dislikes: d.dislikes, myVote: d.myVote } : p
        )
      );
    }
  }

  async function removePost(id: string) {
    if (
      !(await dialogs.confirm({
        message: "Delete this post and its comments?",
        danger: true,
        confirmLabel: "Delete",
      }))
    )
      return;
    const res = await fetch(`/api/community/posts/${id}`, { method: "DELETE" });
    if (res.ok) setPosts((ps) => (ps ?? []).filter((p) => p.id !== id));
  }

  async function sendComment(post: Post) {
    if (!loggedIn) return;
    const draft = (commentDrafts[post.id] ?? "").trim();
    if (!draft) return;
    const res = await fetch(`/api/community/posts/${post.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: draft }),
    });
    if (res.ok) {
      const d = await res.json();
      setPosts((ps) =>
        (ps ?? []).map((p) => (p.id === post.id ? { ...p, comments: [...p.comments, d.comment] } : p))
      );
      setCommentDrafts((c) => ({ ...c, [post.id]: "" }));
    }
  }

  async function removeComment(postId: string, commentId: string) {
    const res = await fetch(`/api/community/posts/${postId}/comments?commentId=${commentId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setPosts((ps) =>
        (ps ?? []).map((p) =>
          p.id === postId
            ? { ...p, comments: p.comments.filter((c) => c.id !== commentId) }
            : p
        )
      );
    }
  }

  const accent = accentColor ?? "#3ea6ff";

  return (
    <div className="space-y-4">
      {isOwner && (
        <form onSubmit={createPost} className="card p-4">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share something with your subscribers"
            rows={3}
            maxLength={1500}
            className="input w-full resize-none"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-xs text-[#717171]">{body.length}/1500</span>
            <button type="submit" disabled={busy || !body.trim()} className="btn-primary">
              {busy ? "Posting…" : "Post"}
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-[#ff6b6b]">{error}</p>}
        </form>
      )}

      {posts === null && <p className="text-sm text-[#aaaaaa]">Loading…</p>}
      {posts !== null && posts.length === 0 && (
        <div className="card p-6 text-center">
          <p className="text-sm text-[#aaaaaa]">No community posts yet.</p>
          <p className="mt-1 text-xs text-[#717171]">
            Community posts are little text updates a channel shares with everyone who visits.
          </p>
        </div>
      )}

      {posts?.map((post) => (
        <article key={post.id} className="anim-fade-in card p-4">
          <div className="flex items-start gap-3">
            <Link
              href={`/channel/${post.author.username}`}
              className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[#3d3d3d]"
            >
              {post.author.avatarUrl ? (
                <img src={post.author.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center font-bold">
                  {post.author.displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </Link>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                <Link href={`/channel/${post.author.username}`} className="hover:underline">
                  {post.author.displayName}
                </Link>
                <span className="ml-2 text-xs font-normal text-[#aaaaaa]">
                  {timeAgo(post.createdAt)}
                </span>
              </p>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm">{post.body}</p>

              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[#aaaaaa]">
                <button
                  type="button"
                  onClick={() => vote(post, 1)}
                  className={`flex items-center gap-1.5 transition-colors hover:text-white ${
                    post.myVote === 1 ? "text-[#3ea6ff]" : ""
                  }`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75 2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904m10.598-9.75H14.25M5.904 18.5c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 01-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 9.953 4.167 9.5 5 9.5h1.053c.472 0 .745.556.5.96a8.958 8.958 0 00-1.302 4.665c0 1.194.232 2.333.654 3.375z" />
                  </svg>
                  {post.likes}
                </button>
                <button
                  type="button"
                  onClick={() => vote(post, -1)}
                  className={`flex items-center gap-1.5 transition-colors hover:text-white ${
                    post.myVote === -1 ? "text-[#ff6b6b]" : ""
                  }`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4 rotate-180" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75 2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904m10.598-9.75H14.25M5.904 18.5c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 01-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 9.953 4.167 9.5 5 9.5h1.053c.472 0 .745.556.5.96a8.958 8.958 0 00-1.302 4.665c0 1.194.232 2.333.654 3.375z" />
                  </svg>
                  {post.dislikes}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setOpenComments((o) =>
                      o.includes(post.id) ? o.filter((x) => x !== post.id) : [...o, post.id]
                    )
                  }
                  className="flex items-center gap-1.5 transition-colors hover:text-white"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
                  </svg>
                  {post.comments.length}
                </button>
                {(isOwner || isAdmin) && (
                  <button
                    type="button"
                    onClick={() => removePost(post.id)}
                    className="ml-auto transition-colors hover:text-[#ff6b6b]"
                  >
                    Delete
                  </button>
                )}
              </div>

              {openComments.includes(post.id) && (
                <div className="anim-fade-in mt-4 space-y-3 border-t border-[#272727] pt-3">
                  {post.comments.map((c) => (
                    <div key={c.id} className="flex items-start gap-2">
                      <Link
                        href={`/channel/${c.author.username}`}
                        className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-[#3d3d3d]"
                      >
                        {c.author.avatarUrl ? (
                          <img src={c.author.avatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-xs font-bold">
                            {c.author.displayName.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs">
                          <Link href={`/channel/${c.author.username}`} className="font-medium hover:underline">
                            {c.author.displayName}
                          </Link>
                          <span className="ml-2 text-[#717171]">{timeAgo(c.createdAt)}</span>
                        </p>
                        <p className="break-words text-sm">{c.body}</p>
                      </div>
                      {(c.author.username === viewerUsername || isOwner || isAdmin) && (
                        <button
                          type="button"
                          onClick={() => removeComment(post.id, c.id)}
                          className="text-xs text-[#717171] transition-colors hover:text-[#ff6b6b]"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  {loggedIn ? (
                    <div className="flex gap-2">
                      <input
                        value={commentDrafts[post.id] ?? ""}
                        onChange={(e) =>
                          setCommentDrafts((c) => ({ ...c, [post.id]: e.target.value }))
                        }
                        onKeyDown={(e) => e.key === "Enter" && sendComment(post)}
                        placeholder="Add a comment"
                        maxLength={500}
                        className="input flex-1 !py-1.5 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => sendComment(post)}
                        className="btn !py-1.5 text-xs"
                        style={{ borderColor: accent, color: accent }}
                      >
                        Reply
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-[#717171]">Log in to comment on posts.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
