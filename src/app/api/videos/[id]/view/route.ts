import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { fail, handleError, ok } from "@/lib/api";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getSessionUser();

    const video = await db.video.findUnique({
      where: { id },
      select: { id: true, visibility: true, ownerId: true },
    });
    if (!video) return fail("Not found", 404);
    if (video.visibility !== "PUBLIC") {
      if (!user || user.id !== video.ownerId) return fail("Not found", 404);
    }

    await db.video.update({ where: { id }, data: { views: { increment: 1 } } });

    if (user) {
      await db.watchHistory.upsert({
        where: { userId_videoId: { userId: user.id, videoId: id } },
        create: { userId: user.id, videoId: id },
        update: { watchedAt: new Date() },
      });
    }

    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
