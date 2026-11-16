import { getRandomFeed } from "@/lib/recommend";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { handleError, ok } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const rl = rateLimit(`feed:${clientIp(req)}`, 240, 60 * 1000);
    if (!rl.ok) return ok({ videos: [] });
    return ok({ videos: await getRandomFeed(12) });
  } catch (err) {
    return handleError(err);
  }
}
