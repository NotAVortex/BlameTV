import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { fail, handleError, ok } from "@/lib/api";
import { fetchYoutubeChannelMeta, youtubeChannelKey } from "@/lib/youtube-comments";

export async function GET() {
  try {
    const user = await requireUser();
    const locked = await db.lockedChannel.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return ok({ locked });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const rl = rateLimit(`lock:${user.id}`, 20, 60 * 60 * 1000);
    if (!rl.ok) return fail("Too many lock attempts. Try later.", 429);

    const raw = String((await req.json().catch(() => ({})))?.url ?? "").trim();
    if (!raw) return fail("Paste a video link, channel URL, or @handle", 422);

    let name: string | null = null;
    let avatar: string | null = null;
    let channelUrl: string | null = null;

    if (/youtu\.be\/|watch\?v=|\/shorts\//.test(raw)) {
      let parsed: URL;
      try {
        parsed = new URL(raw);
      } catch {
        return fail("That does not look like a valid link", 422);
      }
      const v = parsed.searchParams.get("v") ?? parsed.pathname.slice(1);
      if (!v || !/^[A-Za-z0-9_-]{11}$/.test(v)) return fail("That is not a YouTube video link", 422);
      const meta = await fetchYoutubeChannelMeta(v);
      name = meta.name;
      avatar = meta.avatar;
      channelUrl = meta.url;
    } else {
      const handle = /youtube\.com\/@([A-Za-z0-9._-]{3,40})/.exec(raw)?.[1] ?? /^@([A-Za-z0-9._-]{3,40})$/.exec(raw)?.[1];
      if (handle) {
        name = `@${handle}`;
        channelUrl = `https://www.youtube.com/@${handle}`;
      } else if (/^https?:\/\//i.test(raw)) {
        try {
          const parsed = new URL(raw);
          if (!/(^|\.)youtube\.com$/.test(parsed.hostname)) {
            return fail("Only YouTube channels can be locked", 422);
          }
          channelUrl = `https://www.youtube.com${parsed.pathname.replace(/\/(videos|featured|shorts|streams|playlists|community|about).*$/, "")}`;
        } catch {
          return fail("That does not look like a valid link", 422);
        }
      } else {
        return fail("Paste a video link, channel URL, or @handle", 422);
      }
    }

    const key = youtubeChannelKey(channelUrl);
    if (!key) return fail("Could not work out which channel that is. Try a video link instead.", 422);

    const existing = await db.lockedChannel.findUnique({
      where: { ownerId_channelKey: { ownerId: user.id, channelKey: key } },
    });
    if (existing) return fail("You already locked this channel", 409);

    const created = await db.lockedChannel.create({
      data: {
        ownerId: user.id,
        channelKey: key,
        name: name ?? key,
        avatarUrl: avatar,
      },
    });
    return ok({ locked: created }, 201);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireUser();
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return fail("id required");

    const locked = await db.lockedChannel.findUnique({
      where: { id },
      select: { ownerId: true },
    });
    if (!locked || locked.ownerId !== user.id) return fail("Forbidden", 403);

    await db.lockedChannel.delete({ where: { id } });
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
