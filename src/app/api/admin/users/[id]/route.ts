import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { deleteUpload } from "@/lib/storage";
import { fail, handleError, ok } from "@/lib/api";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (action !== "remove-avatar" && action !== "remove-banner") {
      return fail("action must be remove-avatar or remove-banner", 422);
    }

    const target = await db.user.findUnique({
      where: { id },
      select: { id: true, avatarUrl: true, bannerUrl: true },
    });
    if (!target) return fail("User not found", 404);

    if (action === "remove-avatar") {
      await deleteUpload(target.avatarUrl);
      await db.user.update({ where: { id }, data: { avatarUrl: null } });
    } else {
      await deleteUpload(target.bannerUrl);
      await db.user.update({ where: { id }, data: { bannerUrl: null } });
    }

    return ok({ success: true, actor: admin.id });
  } catch (err) {
    return handleError(err);
  }
}
