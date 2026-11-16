import { storageAvailable } from "@/lib/storage";
import { ok } from "@/lib/api";

export async function GET() {
  return ok({ available: storageAvailable() });
}
