import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, handleError, ok } from "@/lib/api";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const post = await db.communityPost.findUnique({
      where: { id },
      select: { authorId: true },
    });
    if (!post) return fail("Post not found", 404);
    if (post.authorId !== user.id && user.role !== "ADMIN") return fail("Forbidden", 403);

    await db.communityPost.delete({ where: { id } });
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
