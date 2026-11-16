import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleError, ok } from "@/lib/api";

export async function GET() {
  try {
    const user = await requireUser();

    const history = await db.watchHistory.findMany({
      where: { userId: user.id },
      orderBy: { watchedAt: "desc" },
      take: 100,
      select: {
        videoId: true,
        watchedAt: true,
        video: {
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
            durationSec: true,
            views: true,
            owner: { select: { displayName: true, username: true } },
          },
        },
      },
    });

    return ok({ history });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE() {
  try {
    const user = await requireUser();
    await db.watchHistory.deleteMany({ where: { userId: user.id } });
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
