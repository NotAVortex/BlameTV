import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handleError, ok } from "@/lib/api";

export async function GET() {
  try {
    await requireAdmin();

    const [reports, videoCount, userCount, commentCount, openReports] =
      await Promise.all([
        db.report.findMany({
          orderBy: { createdAt: "desc" },
          take: 100,
          include: {
            video: { select: { id: true, title: true } },
            reporter: { select: { username: true } },
          },
        }),
        db.video.count(),
        db.user.count(),
        db.comment.count(),
        db.report.count({ where: { status: "OPEN" } }),
      ]);

    return ok({
      reports,
      stats: { videoCount, userCount, commentCount, openReports },
    });
  } catch (err) {
    return handleError(err);
  }
}
