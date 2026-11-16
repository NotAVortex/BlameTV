import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { fail, handleError, ok } from "@/lib/api";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    const viewer = await getSessionUser();

    const channel = await db.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        bannerUrl: true,
        createdAt: true,
        _count: { select: { subscribers: true, videos: true } },
      },
    });
    if (!channel) return fail("Channel not found", 404);

    const videos = await db.video.findMany({
      where: { ownerId: channel.id, visibility: "PUBLIC" },
      orderBy: { createdAt: "desc" },
      take: 48,
      select: {
        id: true,
        title: true,
        thumbnailUrl: true,
        durationSec: true,
        views: true,
        createdAt: true,
      },
    });

    const subscribed = viewer
      ? !!(await db.subscription.findUnique({
          where: {
            subscriberId_channelId: {
              subscriberId: viewer.id,
              channelId: channel.id,
            },
          },
        }))
      : false;

    return ok({ channel, videos, subscribed });
  } catch (err) {
    return handleError(err);
  }
}
