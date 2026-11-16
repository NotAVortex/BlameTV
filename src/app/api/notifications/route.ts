import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { handleError, ok } from "@/lib/api";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return ok({ notifications: [] });

    const notifications = await db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    await db.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    });

    return ok({ notifications });
  } catch (err) {
    return handleError(err);
  }
}
