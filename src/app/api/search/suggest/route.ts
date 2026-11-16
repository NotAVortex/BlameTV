import { db, insensitive } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { handleError, ok } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const rl = rateLimit(`suggest:${clientIp(req)}`, 120, 60 * 1000);
    if (!rl.ok) return ok({ videos: [], users: [] });

    const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 100);
    if (q.length < 2) return ok({ videos: [], users: [] });

    const [videos, users] = await Promise.all([
      db.video.findMany({
        where: {
          visibility: "PUBLIC",
          OR: [
            { title: { contains: q, ...insensitive() } },
            { tags: { contains: q, ...insensitive() } },
          ],
        },
        orderBy: { views: "desc" },
        take: 6,
        select: { id: true, title: true, thumbnailUrl: true },
      }),
      db.user.findMany({
        where: {
          OR: [
            { username: { contains: q, ...insensitive() } },
            { displayName: { contains: q, ...insensitive() } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 4,
        select: { username: true, displayName: true, avatarUrl: true },
      }),
    ]);

    return ok({ videos, users });
  } catch (err) {
    return handleError(err);
  }
}
