import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { profileSchema, linksSchema } from "@/lib/validation";
import { saveUpload, deleteVideoFiles, UploadError } from "@/lib/storage";
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
        accentColor: true,
        bgFrom: true,
        bgTo: true,
        pfpRing: true,
        links: true,
        hideSubscriptions: true,
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

      const data: Record<string, string | boolean | null> = {};
      if (typeof displayName === "string" && displayName.trim())
        data.displayName = displayName.trim().slice(0, 50);
      if (typeof bio === "string") data.bio = bio.trim().slice(0, 1000);
      for (const key of ["accentColor", "bgFrom", "bgTo", "pfpRing"] as const) {
        const v = form.get(key);
        if (typeof v !== "string") continue;
        if (v === "") data[key] = null;
        else if (/^#[0-9a-fA-F]{6}$/.test(v)) data[key] = v;
      }
      const hide = form.get("hideSubscriptions");
      if (typeof hide === "string") data.hideSubscriptions = hide === "true";
      const linksRaw = form.get("links");
      if (typeof linksRaw === "string") {
        try {
          data.links = linksSchema.parse(JSON.parse(linksRaw));
        } catch {
          return fail("Links must be at most 5 entries, each with a label and an https:// URL", 422);
        }
      }

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

    const ownedVideos = await db.video.findMany({
      where: { ownerId: user.id },
      select: { videoUrl: true, thumbnailUrl: true },
    });

    await db.user.delete({ where: { id: user.id } });
    await Promise.all(ownedVideos.map((v) => deleteVideoFiles(v)));
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
