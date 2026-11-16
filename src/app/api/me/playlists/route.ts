import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, handleError, ok } from "@/lib/api";

export async function GET() {
  try {
    const user = await requireUser();
    const playlists = await db.playlist.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        isPublic: true,
        createdAt: true,
        items: {
          select: {
            video: {
              select: { id: true, title: true, thumbnailUrl: true, durationSec: true },
            },
          },
        },
      },
    });
    return ok({ playlists });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { name, videoId } = await req.json();

    if (typeof name !== "string" || !name.trim() || name.length > 80) {
      return fail("Playlist name required (max 80 chars)");
    }

    const nameTrimmed = name.trim();
    let playlist = await db.playlist.findFirst({
      where: { userId: user.id, name: nameTrimmed },
      select: { id: true },
    });
    if (!playlist) {
      playlist = await db.playlist.create({
        data: { name: nameTrimmed, userId: user.id },
        select: { id: true },
      });
    }

    if (typeof videoId === "string" && videoId) {
      const video = await db.video.findUnique({ where: { id: videoId } });
      if (video) {
        await db.playlistItem.upsert({
          where: { playlistId_videoId: { playlistId: playlist.id, videoId } },
          create: { playlistId: playlist.id, videoId },
          update: {},
        });
      }
    }

    return ok({ id: playlist.id }, 201);
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    const { id, isPublic } = await req.json();
    if (typeof id !== "string" || typeof isPublic !== "boolean") {
      return fail("id and isPublic required");
    }
    const playlist = await db.playlist.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!playlist || playlist.userId !== user.id) return fail("Forbidden", 403);
    await db.playlist.update({ where: { id }, data: { isPublic } });
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(req: Request) {
  try {
    const user = await requireUser();
    const { playlistId, videoId, action } = await req.json();

    if (typeof playlistId !== "string" || typeof videoId !== "string") {
      return fail("playlistId and videoId required");
    }

    const playlist = await db.playlist.findUnique({
      where: { id: playlistId },
      select: { id: true, userId: true },
    });
    if (!playlist || playlist.userId !== user.id) return fail("Forbidden", 403);

    const video = await db.video.findUnique({ where: { id: videoId } });
    if (!video) return fail("Video not found", 404);

    if (action === "remove") {
      await db.playlistItem.deleteMany({ where: { playlistId, videoId } });
      return ok({ added: false });
    }

    await db.playlistItem.upsert({
      where: { playlistId_videoId: { playlistId, videoId } },
      create: { playlistId, videoId },
      update: {},
    });
    return ok({ added: true });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireUser();
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return fail("id required");

    const playlist = await db.playlist.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!playlist || playlist.userId !== user.id) return fail("Forbidden", 403);

    await db.playlist.delete({ where: { id } });
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
