import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { fail, handleError, ok } from "@/lib/api";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;

    const channel = await db.user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (!channel) return fail("User not found", 404);

    const whispers = await db.whisper.findMany({
      where: { recipientId: channel.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        body: true,
        createdAt: true,
        sender: { select: { username: true, displayName: true, avatarUrl: true } },
      },
    });

    return ok({
      whispers: whispers.map((w) => ({
        id: w.id,
        body: w.body,
        createdAt: w.createdAt.toISOString(),
        sender: w.sender,
      })),
    });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const user = await requireUser();
    const rl = rateLimit(`whisper:${user.id}`, 10, 60 * 1000);
    if (!rl.ok) return fail("You are whispering too fast. Slow down a little.", 429);

    const { username } = await params;
    const channel = await db.user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (!channel) return fail("User not found", 404);

    const body = (await req.json().catch(() => ({})))?.body;
    if (typeof body !== "string" || !body.trim()) return fail("Write a whisper first", 422);

    const created = await db.whisper.create({
      data: {
        body: body.trim().slice(0, 500),
        senderId: user.id,
        recipientId: channel.id,
      },
      select: {
        id: true,
        body: true,
        createdAt: true,
        sender: { select: { username: true, displayName: true, avatarUrl: true } },
      },
    });

    return ok(
      {
        whisper: {
          id: created.id,
          body: created.body,
          createdAt: created.createdAt.toISOString(),
          sender: created.sender,
        },
      },
      201
    );
  } catch (err) {
    return handleError(err);
  }
}
