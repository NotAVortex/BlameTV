import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, handleError, ok } from "@/lib/api";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const comment = await db.comment.findUnique({ where: { id } });
    if (!comment) return fail("Not found", 404);

    const existing = await db.commentLike.findUnique({
      where: { userId_commentId: { userId: user.id, commentId: id } },
    });

    if (existing) {
      await db.commentLike.delete({ where: { id: existing.id } });
    } else {
      await db.commentLike.create({ data: { userId: user.id, commentId: id } });
    }

    const likes = await db.commentLike.count({ where: { commentId: id } });
    return ok({ liked: !existing, likes });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const comment = await db.comment.findUnique({ where: { id } });
    if (!comment) return fail("Not found", 404);
    if (comment.authorId !== user.id && user.role !== "ADMIN") {
      return fail("Forbidden", 403);
    }

    await db.comment.delete({ where: { id } });
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
