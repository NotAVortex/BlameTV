import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { registerSchema } from "@/lib/validation";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { fail, handleError, ok } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const rl = rateLimit(`register:${clientIp(req)}`, 5, 60 * 60 * 1000);
    if (!rl.ok) return fail("Too many attempts. Try later.", 429);

    const data = registerSchema.parse(await req.json());

    const existing = await db.user.findFirst({
      where: { OR: [{ email: data.email }, { username: data.username }] },
      select: { email: true, username: true },
    });
    if (existing) {
      return fail(
        existing.email === data.email ? "Email already registered" : "Username taken",
        409
      );
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const isFirstUser = (await db.user.count()) === 0;

    const user = await db.user.create({
      data: {
        email: data.email,
        username: data.username,
        displayName: data.displayName,
        passwordHash,
        role: isFirstUser ? "ADMIN" : "USER",
      },
      select: { id: true },
    });

    await createSession(user.id);
    return ok({ success: true }, 201);
  } catch (err) {
    return handleError(err);
  }
}
