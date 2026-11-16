import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { fail, handleError, ok } from "@/lib/api";

export async function GET() {
  try {
    await requireAdmin();

    const users = await db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        createdAt: true,
        avatarUrl: true,
        bannerUrl: true,
        _count: { select: { videos: true, comments: true } },
      },
    });

    return ok({ users });
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(req: Request) {
  try {
    const admin = await requireAdmin();
    const { userId, role } = await req.json();

    if (typeof userId !== "string" || (role !== "USER" && role !== "ADMIN")) {
      return fail("userId and role (USER|ADMIN) required");
    }
    if (userId === admin.id) return fail("You cannot change your own role");

    await db.user.update({ where: { id: userId }, data: { role } });
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
