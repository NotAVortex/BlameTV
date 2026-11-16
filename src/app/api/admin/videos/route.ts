import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handleError, ok } from "@/lib/api";

export async function GET() {
  try {
    await requireAdmin();

    const videos = await db.video.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        source: true,
        visibility: true,
        createdAt: true,
        owner: { select: { id: true, username: true, displayName: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });

    return ok({ videos });
  } catch (err) {
    return handleError(err);
  }
}
