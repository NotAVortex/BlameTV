import { readFile } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { fail, handleError } from "@/lib/api";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

function safeName(title: string, ext: string): string {
  const base = title.replace(/[^a-zA-Z0-9 _-]/g, "").trim().slice(0, 80) || "video";
  return `${base.replace(/\s+/g, "-")}${ext}`;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getSessionUser();

    const video = await db.video.findUnique({
      where: { id },
      select: {
        title: true,
        videoUrl: true,
        visibility: true,
        ownerId: true,
      },
    });
    if (!video) return fail("Not found", 404);
    if (video.visibility !== "PUBLIC") {
      if (!user || (user.id !== video.ownerId && user.role !== "ADMIN")) {
        return fail("Not found", 404);
      }
    }
    if (!video.videoUrl) return fail("Embedded videos have no downloadable file", 400);

    const ext = path.extname(new URL(video.videoUrl, "http://x").pathname) || ".mp4";
    const filename = safeName(video.title, ext);
    const headers = {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=0, no-store",
    };

    if (video.videoUrl.startsWith("/api/files/")) {
      const name = video.videoUrl.slice("/api/files/".length);
      if (!/^[a-f0-9-]{36}\.[a-z0-9]+$/i.test(name)) return fail("Not found", 404);
      const filePath = path.join(UPLOAD_DIR, name);
      if (!filePath.startsWith(UPLOAD_DIR + path.sep)) return fail("Not found", 404);
      const buf = await readFile(filePath);
      return new Response(new Uint8Array(buf), { headers });
    }

    const upstream = await fetch(video.videoUrl, { signal: AbortSignal.timeout(30000) });
    if (!upstream.ok || !upstream.body) return fail("File unavailable", 404);
    return new Response(upstream.body, { headers });
  } catch (err) {
    return handleError(err);
  }
}
