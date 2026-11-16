import { readFileSync, writeFileSync } from "fs";
import path from "path";
import crypto from "crypto";

let cached: string | null = null;

export function sessionSecret(): string {
  if (cached) return cached;

  const fromEnv = process.env.SESSION_SECRET;
  if (fromEnv && fromEnv.length >= 32) {
    cached = fromEnv;
    return cached;
  }

  const file = path.join(process.cwd(), ".session-secret");
  try {
    const fromFile = readFileSync(file, "utf8").trim();
    if (fromFile.length >= 32) {
      cached = fromFile;
      return cached;
    }
  } catch {
    // file does not exist yet
  }

  cached = crypto.randomBytes(32).toString("hex");
  writeFileSync(file, cached);
  return cached;
}
