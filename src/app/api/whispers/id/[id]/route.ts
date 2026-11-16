import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, handleError, ok } from "@/lib/api";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const whisper = await db.whisper.findUnique({ where: { id } });
    if (!whisper) return fail("Not found", 404);

    if (whisper.senderId !== user.id && whisper.recipientId !== user.id && user.role !== "ADMIN") {
      return fail("You can only remove whispers you wrote or received on your channel", 403);
    }

    await db.whisper.delete({ where: { id } });
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
