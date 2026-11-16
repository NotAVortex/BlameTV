import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleError, ok } from "@/lib/api";

export async function GET() {
  try {
    const user = await requireUser();

    const videos = await db.video.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        id: true,
        title: true,
        thumbnailUrl: true,
        visibility: true,
        views: true,
        createdAt: true,
        _count: { select: { likes: true, comments: true, hypes: true } },
      },
    });

    const totals = videos.reduce(
      (acc, v) => {
        acc.views += v.views;
        acc.likes += v._count.likes;
        acc.comments += v._count.comments;
        acc.hypes += v._count.hypes;
        return acc;
      },
      { views: 0, likes: 0, comments: 0, hypes: 0 }
    );

    const subscribers = await db.subscription.count({
      where: { channelId: user.id },
    });

    const recentComments = await db.comment.findMany({
      where: { video: { ownerId: user.id } },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        body: true,
        createdAt: true,
        author: { select: { username: true, displayName: true, avatarUrl: true } },
        video: { select: { id: true, title: true } },
      },
    });

    return ok({ videos, totals, subscribers, recentComments });
  } catch (err) {
    return handleError(err);
  }
}
