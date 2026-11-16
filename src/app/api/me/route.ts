import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { profileSchema } from "@/lib/validation";
import { saveUpload, UploadError } from "@/lib/storage";
import { validateAnimation } from "@/lib/media";
import { fail, handleError, ok } from "@/lib/api";

export async function GET() {
  try {
    const user = await requireUser();
    const me = await db.user.findUnique({
      where: { id: user.id },
      select: {
        email: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        bannerUrl: true,
        role: true,
        createdAt: true,
      },
    });
    return ok({ user: me });
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const displayName = form.get("displayName");
      const bio = form.get("bio");
      const avatar = form.get("avatar");
      const banner = form.get("banner");

      const data: Record<string, string> = {};
      if (typeof displayName === "string" && displayName.trim())
        data.displayName = displayName.trim().slice(0, 50);
      if (typeof bio === "string") data.bio = bio.trim().slice(0, 1000);

      try {
        if (avatar instanceof File && avatar.size > 0) {
          const err = validateAnimation(
            Buffer.from(await avatar.arrayBuffer()),
            avatar.type,
            "avatar"
          );
          if (err) return fail(err, 422);
          data.avatarUrl = await saveUpload(avatar, "avatar");
        }
        if (banner instanceof File && banner.size > 0) {
          const err = validateAnimation(
            Buffer.from(await banner.arrayBuffer()),
            banner.type,
            "banner"
          );
          if (err) return fail(err, 422);
          data.bannerUrl = await saveUpload(banner, "banner");
        }
      } catch (e) {
        if (e instanceof UploadError) return fail(e.message, 413);
        throw e;
      }

      await db.user.update({ where: { id: user.id }, data });
      return ok({ success: true });
    }

    const data = profileSchema.parse(await req.json());
    await db.user.update({ where: { id: user.id }, data });
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireUser();
    const { password } = await req.json();
    if (typeof password !== "string") return fail("Password required");

    const me = await db.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });
    if (!me || !(await bcrypt.compare(password, me.passwordHash))) {
      return fail("Incorrect password", 403);
    }

    await db.user.delete({ where: { id: user.id } });
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
