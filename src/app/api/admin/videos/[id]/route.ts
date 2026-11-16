import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handleError, ok } from "@/lib/api";
import { deleteVideoFiles } from "@/lib/storage";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const video = await db.video.findUnique({
      where: { id },
      select: { videoUrl: true, thumbnailUrl: true },
    });
    if (!video) return ok({ success: true });

    await db.video.delete({ where: { id } });
    await deleteVideoFiles(video);
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
