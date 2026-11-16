import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleError } from "@/lib/api";

export async function GET() {
  try {
    const user = await requireUser();

    const [account, videos, comments, likes, history, playlists, subscriptions] =
      await Promise.all([
        db.user.findUnique({
          where: { id: user.id },
          select: {
            email: true,
            username: true,
            displayName: true,
            bio: true,
            role: true,
            createdAt: true,
          },
        }),
        db.video.findMany({
          where: { ownerId: user.id },
          select: {
            title: true,
            description: true,
            category: true,
            visibility: true,
            views: true,
            createdAt: true,
          },
        }),
        db.comment.findMany({
          where: { authorId: user.id },
          select: { body: true, createdAt: true },
        }),
        db.videoLike.findMany({
          where: { userId: user.id },
          select: { videoId: true, value: true },
        }),
        db.watchHistory.findMany({
          where: { userId: user.id },
          select: { videoId: true, watchedAt: true },
        }),
        db.playlist.findMany({
          where: { userId: user.id },
          select: { name: true, createdAt: true },
        }),
        db.subscription.findMany({
          where: { subscriberId: user.id },
          select: { channelId: true, createdAt: true },
        }),
      ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      account,
      videos,
      comments,
      videoLikes: likes,
      watchHistory: history,
      playlists,
      subscriptions,
    };

    return new Response(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="blametv-data-${user.username}.json"`,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
