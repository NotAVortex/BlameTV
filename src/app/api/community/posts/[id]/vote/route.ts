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
    const rl = rateLimit(`communityvote:${user.id}`, 60, 60 * 1000);
    if (!rl.ok) return fail("Slow down a little", 429);

    const value = Number((await req.json().catch(() => ({})))?.value);
    if (value !== 1 && value !== -1 && value !== 0) {
      return fail("value must be 1, -1 or 0", 422);
    }

    const post = await db.communityPost.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!post) return fail("Post not found", 404);

    if (value === 0) {
      await db.communityPostLike.deleteMany({
        where: { userId: user.id, postId: id },
      });
    } else {
      await db.communityPostLike.upsert({
        where: { userId_postId: { userId: user.id, postId: id } },
        create: { userId: user.id, postId: id, value },
        update: { value },
      });
    }

    const [likes, dislikes] = await Promise.all([
      db.communityPostLike.count({ where: { postId: id, value: 1 } }),
      db.communityPostLike.count({ where: { postId: id, value: -1 } }),
    ]);
    return ok({ likes, dislikes, myVote: value });
  } catch (err) {
    return handleError(err);
  }
}
