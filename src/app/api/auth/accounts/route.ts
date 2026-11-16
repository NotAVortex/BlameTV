import { requireUser, listStashedAccounts, switchAccount, removeStashedAccount } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { fail, handleError, ok } from "@/lib/api";

export async function GET() {
  try {
    await requireUser();
    return ok({ accounts: await listStashedAccounts() });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const rl = rateLimit(`switch:${clientIp(req)}`, 30, 60 * 1000);
    if (!rl.ok) return fail("Too many switches. Try later.", 429);

    const body = await req.json().catch(() => ({}));
    const username = typeof body?.username === "string" ? body.username.trim().slice(0, 30) : "";
    if (!username) return fail("username required", 422);

    const switched = await switchAccount(username);
    if (!switched) return fail("That account is not saved in this browser", 404);
    return ok({ success: true, username });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: Request) {
  try {
    const rl = rateLimit(`switch:${clientIp(req)}`, 30, 60 * 1000);
    if (!rl.ok) return fail("Too many requests. Try later.", 429);

    const body = await req.json().catch(() => ({}));
    const username = typeof body?.username === "string" ? body.username.trim().slice(0, 30) : "";
    if (!username) return fail("username required", 422);

    const removed = await removeStashedAccount(username);
    if (!removed) return fail("That account is not saved in this browser", 404);
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
