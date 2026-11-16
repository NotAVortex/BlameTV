import Link from "next/link";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import VideoCard from "@/components/VideoCard";

export const metadata = { title: "Subscriptions — BlameTV" };

export default async function SubscriptionsPage() {
  const user = await getSessionUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-6 py-20 text-center">
        <h1 className="mb-3 text-2xl font-bold">Subscriptions</h1>
        <p className="mb-6 text-sm text-[#aaaaaa]">
          Sign in to see the newest videos from the channels you follow.
        </p>
        <Link href="/login" className="btn-primary">Sign in</Link>
      </div>
    );
  }

  const subs = await db.subscription.findMany({
    where: { subscriberId: user.id },
    select: { channelId: true },
  });
  const channelIds = subs.map((s) => s.channelId);

  const videos =
    channelIds.length > 0
      ? await db.video.findMany({
          where: { ownerId: { in: channelIds }, visibility: { in: ["PUBLIC", "UNLISTED"] } },
          orderBy: { createdAt: "desc" },
          take: 48,
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
            durationSec: true,
            views: true,
            createdAt: true,
            owner: { select: { username: true, displayName: true, avatarUrl: true } },
      sourceChannel: true,
      sourceChannelUrl: true,
      sourceChannelAvatar: true,
          },
        })
      : [];

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <h1 className="mb-6 text-xl font-bold">Subscriptions</h1>
      {videos.length === 0 ? (
        <p className="text-sm text-[#aaaaaa]">
          Nothing here yet. Subscribe to channels and their newest videos will appear on this page.{" "}
          <Link href="/" className="text-[#3ea6ff] underline">
            Find channels
          </Link>
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {videos.map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </div>
      )}
    </div>
  );
}
