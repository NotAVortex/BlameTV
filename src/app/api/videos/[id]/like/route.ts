import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, handleError, ok } from "@/lib/api";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const { value } = await req.json();

    if (value !== 1 && value !== -1 && value !== 0) {
      return fail("value must be 1, -1 or 0");
    }

    const video = await db.video.findUnique({ where: { id } });
    if (!video) return fail("Not found", 404);

    if (value === 0) {
      await db.videoLike.deleteMany({ where: { userId: user.id, videoId: id } });
    } else {
      await db.videoLike.upsert({
        where: { userId_videoId: { userId: user.id, videoId: id } },
        create: { userId: user.id, videoId: id, value },
        update: { value },
      });
    }

    const [likes, dislikes] = await Promise.all([
      db.videoLike.count({ where: { videoId: id, value: 1 } }),
      db.videoLike.count({ where: { videoId: id, value: -1 } }),
    ]);

    return ok({ likes, dislikes });
  } catch (err) {
    return handleError(err);
  }
}
