import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, handleError, ok } from "@/lib/api";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const user = await requireUser();
    const { username } = await params;

    const channel = await db.user.findUnique({
      where: { username },
      select: { id: true, displayName: true },
    });
    if (!channel) return fail("Channel not found", 404);
    if (channel.id === user.id) return fail("You cannot subscribe to yourself");

    const existing = await db.subscription.findUnique({
      where: {
        subscriberId_channelId: { subscriberId: user.id, channelId: channel.id },
      },
    });

    if (existing) {
      await db.subscription.delete({ where: { id: existing.id } });
    } else {
      await db.subscription.create({
        data: { subscriberId: user.id, channelId: channel.id },
      });
      await db.notification.create({
        data: {
          userId: channel.id,
          type: "SUBSCRIBE",
          body: `${user.displayName} subscribed to your channel`,
          link: `/channel/${user.username}`,
        },
      });
    }

    const count = await db.subscription.count({ where: { channelId: channel.id } });
    return ok({ subscribed: !existing, subscribers: count });
  } catch (err) {
    return handleError(err);
  }
}
