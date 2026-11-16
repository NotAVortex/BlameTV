import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { fail, handleError, ok } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const rl = rateLimit(`login:${clientIp(req)}`, 10, 15 * 60 * 1000);
    if (!rl.ok) return fail("Too many attempts. Try later.", 429);

    const data = loginSchema.parse(await req.json());

    const user = await db.user.findUnique({
      where: { email: data.email },
      select: { id: true, passwordHash: true },
    });

    if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) {
      return fail("Invalid email or password", 401);
    }

    await createSession(user.id);
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
