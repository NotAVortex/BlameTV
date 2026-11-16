import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { fail, handleError, ok } from "@/lib/api";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const { status } = await req.json();

    if (status !== "RESOLVED" && status !== "DISMISSED") {
      return fail("status must be RESOLVED or DISMISSED");
    }

    const report = await db.report.update({
      where: { id },
      data: { status },
    });
    return ok({ report: { id: report.id, status: report.status } });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const report = await db.report.findUnique({
      where: { id },
      select: { id: true, videoId: true, commentId: true },
    });
    if (!report) return fail("Not found", 404);

    if (report.videoId) await db.video.delete({ where: { id: report.videoId } });
    if (report.commentId) await db.comment.delete({ where: { id: report.commentId } });
    await db.report.delete({ where: { id } });

    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
