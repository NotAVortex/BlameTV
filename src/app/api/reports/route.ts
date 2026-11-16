import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { reportSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { fail, handleError, ok } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const rl = rateLimit(`report:${user.id}`, 10, 60 * 60 * 1000);
    if (!rl.ok) return fail("Too many reports. Try later.", 429);

    const data = reportSchema.parse(await req.json());

    if (!data.videoId && !data.commentId) {
      return fail("videoId or commentId required");
    }

    if (data.videoId) {
      const video = await db.video.findUnique({ where: { id: data.videoId } });
      if (!video) return fail("Video not found", 404);
    }
    if (data.commentId) {
      const comment = await db.comment.findUnique({ where: { id: data.commentId } });
      if (!comment) return fail("Comment not found", 404);
    }

    const report = await db.report.create({
      data: {
        reason: data.reason,
        details: data.details,
        videoId: data.videoId ?? null,
        commentId: data.commentId ?? null,
        reporterId: user.id,
      },
    });

    return ok({ id: report.id }, 201);
  } catch (err) {
    return handleError(err);
  }
}
