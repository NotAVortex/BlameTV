import { db } from "@/lib/db";
import { getSessionUser, requireUser } from "@/lib/auth";
import { videoUpdateSchema } from "@/lib/validation";
import { fail, handleError, ok } from "@/lib/api";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getSessionUser();

    const video = await db.video.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        _count: { select: { likes: true, comments: true } },
      },
    });

    if (!video) return fail("Not found", 404);
    if (video.visibility !== "PUBLIC") {
      if (!user || (user.id !== video.ownerId && user.role !== "ADMIN")) {
        return fail("Not found", 404);
      }
    }

    const myLike = user
      ? await db.videoLike.findUnique({
          where: { userId_videoId: { userId: user.id, videoId: id } },
        })
      : null;

    return ok({ video, myLike: myLike?.value ?? 0 });
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const video = await db.video.findUnique({ where: { id } });
    if (!video) return fail("Not found", 404);
    if (video.ownerId !== user.id) return fail("Forbidden", 403);

    const data = videoUpdateSchema.parse(await req.json());
    const updated = await db.video.update({ where: { id }, data });
    return ok({ video: { id: updated.id } });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const video = await db.video.findUnique({ where: { id } });
    if (!video) return fail("Not found", 404);
    if (video.ownerId !== user.id && user.role !== "ADMIN") {
      return fail("Forbidden", 403);
    }
    await db.video.delete({ where: { id } });
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
