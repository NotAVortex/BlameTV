import { db } from "@/lib/db";
import { requireUser, getSessionUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { fail, handleError, ok } from "@/lib/api";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    const viewer = await getSessionUser();
    const channel = await db.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { id: true },
    });
    if (!channel) return fail("Channel not found", 404);

    const posts = await db.communityPost.findMany({
      where: { authorId: channel.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        body: true,
        createdAt: true,
        author: { select: { username: true, displayName: true, avatarUrl: true } },
        likes: { select: { userId: true, value: true } },
        comments: {
          orderBy: { createdAt: "asc" },
          take: 50,
          select: {
            id: true,
            body: true,
            createdAt: true,
            author: { select: { username: true, displayName: true, avatarUrl: true } },
          },
        },
      },
    });

    return ok({
      posts: posts.map((p) => ({
        id: p.id,
        body: p.body,
        createdAt: p.createdAt,
        author: p.author,
        likes: p.likes.filter((l) => l.value === 1).length,
        dislikes: p.likes.filter((l) => l.value === -1).length,
        myVote: viewer ? (p.likes.find((l) => l.userId === viewer.id)?.value ?? 0) : 0,
        comments: p.comments,
      })),
    });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const user = await requireUser();
    const { username } = await params;
    if (user.username !== username.toLowerCase()) {
      return fail("You can only post on your own channel", 403);
    }
    const rl = rateLimit(`community:${user.id}`, 10, 60 * 60 * 1000);
    if (!rl.ok) return fail("Too many posts. Try later.", 429);

    const body = String((await req.json().catch(() => ({})))?.body ?? "").trim();
    if (!body || body.length > 1500) {
      return fail("Write something first (max 1500 characters)", 422);
    }

    const post = await db.communityPost.create({
      data: { body, authorId: user.id },
      select: {
        id: true,
        body: true,
        createdAt: true,
        author: { select: { username: true, displayName: true, avatarUrl: true } },
      },
    });
    return ok({ post: { ...post, likes: 0, dislikes: 0, myVote: 0, comments: [] } }, 201);
  } catch (err) {
    return handleError(err);
  }
}
