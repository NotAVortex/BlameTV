import { destroySession, getSessionUser } from "@/lib/auth";
import { handleError, ok } from "@/lib/api";

export async function POST() {
  try {
    await destroySession();
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}

export async function GET() {
  try {
    const user = await getSessionUser();
    return ok({ user });
  } catch (err) {
    return handleError(err);
  }
}
