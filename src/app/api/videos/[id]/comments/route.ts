import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { commentSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { fail, handleError, ok } from "@/lib/api";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const comments = await db.comment.findMany({
      where: { videoId: id, parentId: null },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        body: true,
        createdAt: true,
        author: { select: { username: true, displayName: true, avatarUrl: true, verified: true } },
        _count: { select: { likes: true, replies: true } },
      },
    });

    const replyLists = await Promise.all(
      comments.map((c) =>
        db.comment.findMany({
          where: { parentId: c.id },
          orderBy: { createdAt: "asc" },
          take: 50,
          select: {
            id: true,
            body: true,
            createdAt: true,
            author: { select: { username: true, displayName: true, avatarUrl: true, verified: true } },
            _count: { select: { likes: true } },
          },
        })
      )
    );

    const shaped = comments.map((c, i) => ({
      id: c.id,
      body: c.body,
      createdAt: c.createdAt,
      author: c.author,
      likes: c._count.likes,
      replyCount: c._count.replies,
      replies: replyLists[i],
    }));

    return ok({ comments: shaped });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const rl = rateLimit(`comment:${user.id}`, 10, 60 * 1000);
    if (!rl.ok) return fail("Slow down — too many comments.", 429);

    const data = commentSchema.parse(await req.json());

    const video = await db.video.findUnique({
      where: { id },
      select: { id: true, visibility: true, ownerId: true, title: true },
    });
    if (!video) return fail("Not found", 404);

    let parentId: string | null = null;
    if (data.parentId) {
      const parent = await db.comment.findUnique({
        where: { id: data.parentId },
        select: { id: true, videoId: true, parentId: true },
      });
      if (!parent || parent.videoId !== id) return fail("Invalid parent comment");
      parentId = parent.parentId ?? parent.id;
    }

    const comment = await db.comment.create({
      data: {
        body: data.body,
        videoId: id,
        authorId: user.id,
        parentId: parentId ?? null,
      },
      select: { id: true },
    });

    if (video.ownerId !== user.id) {
      await db.notification.create({
        data: {
          userId: video.ownerId,
          type: "COMMENT",
          body: `${user.displayName} commented on "${video.title}"`,
          link: `/watch/${id}`,
        },
      });
    }

    return ok({ id: comment.id }, 201);
  } catch (err) {
    return handleError(err);
  }
}
