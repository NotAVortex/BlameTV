import { db, insensitive } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleError, ok } from "@/lib/api";

export type ImportedCreator = {
  name: string;
  url: string | null;
  avatar: string | null;
  videoCount: number;
  thumbnail: string | null;
  latest: string;
};

export async function GET(req: Request) {
  try {
    await requireUser();
    const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 100);

    await backfillSourceChannels();

    const videos = await db.video.findMany({
      where: {
        source: { not: "UPLOAD" },
        sourceChannel: {
          not: null,
          contains: q || undefined,
          ...insensitive(),
        },
      },
      select: {
        sourceChannel: true,
        sourceChannelUrl: true,
        sourceChannelAvatar: true,
        thumbnailUrl: true,
        createdAt: true,
      },
      take: 2000,
      orderBy: { createdAt: "desc" },
    });

    const map = new Map<string, ImportedCreator>();
    for (const v of videos) {
      const name = v.sourceChannel!;
      const existing = map.get(name);
      if (existing) {
        existing.videoCount += 1;
        if (!existing.avatar && v.sourceChannelAvatar) existing.avatar = v.sourceChannelAvatar;
        if (!existing.thumbnail && v.thumbnailUrl) existing.thumbnail = v.thumbnailUrl;
      } else {
        map.set(name, {
          name,
          url: v.sourceChannelUrl,
          avatar: v.sourceChannelAvatar,
          videoCount: 1,
          thumbnail: v.thumbnailUrl,
          latest: v.createdAt.toISOString(),
        });
      }
    }

    const creators = Array.from(map.values())
      .sort((a, b) => b.videoCount - a.videoCount)
      .slice(0, 60);
    return ok({ creators });
  } catch (err) {
    return handleError(err);
  }
}

async function backfillSourceChannels(): Promise<void> {
  const missing = await db.video.findMany({
    where: { source: { not: "UPLOAD" }, sourceChannel: null, embedUrl: { not: null } },
    select: { id: true, description: true },
    take: 300,
  });
  for (const v of missing) {
    const m = /Imported from [^\u2022]+ \u2022 (.+)$/.exec(v.description);
    if (m && m[1].trim()) {
      await db.video.update({
        where: { id: v.id },
        data: { sourceChannel: m[1].trim().slice(0, 100) },
      });
    }
  }
}
