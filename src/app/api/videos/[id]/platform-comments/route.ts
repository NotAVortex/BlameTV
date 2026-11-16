import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { fail, handleError, ok } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import {
  fetchYoutubeComments,
  youtubeIdFromEmbedUrl,
} from "@/lib/youtube-comments";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rl = rateLimit(`platformcomments:${clientIp(req)}`, 60, 60 * 1000);
    if (!rl.ok) return fail("Too many requests. Try again in a minute.", 429);

    const video = await db.video.findUnique({
      where: { id },
      select: { visibility: true, ownerId: true, embedUrl: true },
    });
    if (!video) return fail("Not found", 404);

    const user = await getSessionUser();
    const isOwner = user?.id === video.ownerId;
    const isAdmin = user?.role === "ADMIN";
    if (video.visibility !== "PUBLIC" && !isOwner && !isAdmin) {
      return fail("Not found", 404);
    }

    if (!video.embedUrl) return fail("This video is not an import", 422);
    const ytId = youtubeIdFromEmbedUrl(video.embedUrl);
    if (!ytId) {
      return fail("Platform comments are only available for YouTube videos", 422);
    }

    const comments = await fetchYoutubeComments(ytId);
    return ok({ comments });
  } catch (err) {
    return handleError(err);
  }
}
