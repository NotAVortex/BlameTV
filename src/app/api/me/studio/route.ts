import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleError, ok } from "@/lib/api";

export async function GET() {
  try {
    const user = await requireUser();

    const videos = await db.video.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        thumbnailUrl: true,
        visibility: true,
        views: true,
        createdAt: true,
        _count: { select: { likes: true, comments: true } },
      },
    });

    const totals = videos.reduce(
      (acc, v) => {
        acc.views += v.views;
        acc.likes += v._count.likes;
        acc.comments += v._count.comments;
        return acc;
      },
      { views: 0, likes: 0, comments: 0 }
    );

    const subscribers = await db.subscription.count({
      where: { channelId: user.id },
    });

    return ok({ videos, totals, subscribers });
  } catch (err) {
    return handleError(err);
  }
}
