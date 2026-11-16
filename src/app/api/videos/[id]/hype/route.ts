import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { fail, handleError, ok } from "@/lib/api";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const rl = rateLimit(`hype:${user.id}`, 30, 60 * 1000);
    if (!rl.ok) return fail("Too many hypes. Try later.", 429);

    const { id } = await params;
    const video = await db.video.findUnique({
      where: { id },
      select: { id: true, ownerId: true },
    });
    if (!video) return fail("Not found", 404);
    if (video.ownerId === user.id) return fail("You cannot hype your own video", 422);

    const existing = await db.hype.findUnique({
      where: { userId_videoId: { userId: user.id, videoId: id } },
    });

    if (existing) {
      await db.hype.delete({ where: { userId_videoId: { userId: user.id, videoId: id } } });
    } else {
      await db.hype.create({ data: { userId: user.id, videoId: id } });
    }

    const count = await db.hype.count({ where: { videoId: id } });
    return ok({ hyped: !existing, count });
  } catch (err) {
    return handleError(err);
  }
}
