import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { fail, handleError, ok } from "@/lib/api";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const rl = rateLimit(`communitycomment:${user.id}`, 20, 60 * 1000);
    if (!rl.ok) return fail("Slow down a little", 429);

    const body = String((await req.json().catch(() => ({})))?.body ?? "").trim();
    if (!body || body.length > 500) return fail("Comment required (max 500 characters)", 422);

    const post = await db.communityPost.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!post) return fail("Post not found", 404);

    const comment = await db.communityPostComment.create({
      data: { body, postId: id, authorId: user.id },
      select: {
        id: true,
        body: true,
        createdAt: true,
        author: { select: { username: true, displayName: true, avatarUrl: true } },
      },
    });
    return ok({ comment }, 201);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const commentId = new URL(req.url).searchParams.get("commentId");
    if (!commentId) return fail("commentId required");

    const comment = await db.communityPostComment.findUnique({
      where: { id: commentId },
      select: { authorId: true, post: { select: { authorId: true } } },
    });
    if (!comment) return fail("Comment not found", 404);

    const allowed =
      comment.authorId === user.id ||
      comment.post.authorId === user.id ||
      user.role === "ADMIN";
    if (!allowed) return fail("Forbidden", 403);

    await db.communityPostComment.delete({ where: { id: commentId } });
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
