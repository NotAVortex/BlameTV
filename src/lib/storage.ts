import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { validateAnimation } from "./media";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

const ALLOWED_VIDEO_MIME = new Set([
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
]);

const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const EXT_BY_MIME: Record<string, string> = {
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/ogg": ".ogv",
  "video/quicktime": ".mov",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export class UploadError extends Error {}

function maxBytes(kind: "video" | "image"): number {
  const mb = kind === "video" ? Number(process.env.MAX_UPLOAD_MB ?? 200) : 5;
  return mb * 1024 * 1024;
}

export async function saveUpload(
  file: File,
  kind: "video" | "image" | "avatar" | "banner"
): Promise<string> {
  if (kind === "video" && !ALLOWED_VIDEO_MIME.has(file.type)) {
    throw new UploadError("Only MP4, WebM, OGG or MOV videos are allowed");
  }
  const imageKind = kind === "video" ? null : kind;
  if (imageKind && !ALLOWED_IMAGE_MIME.has(file.type)) {
    throw new UploadError("Only JPG, PNG, WebP or GIF images are allowed");
  }
  const sizeKind = kind === "video" ? "video" : "image";
  if (file.size <= 0 || file.size > maxBytes(sizeKind)) {
    throw new UploadError(
      `File too large (max ${Math.floor(maxBytes(sizeKind) / 1024 / 1024)} MB)`
    );
  }

  if (imageKind === "avatar" || imageKind === "banner") {
    const animError = validateAnimation(
      Buffer.from(await file.arrayBuffer()),
      file.type,
      imageKind
    );
    if (animError) throw new UploadError(animError);
  }

  const ext = EXT_BY_MIME[file.type] ?? (kind === "video" ? ".mp4" : ".jpg");
  const name = `${crypto.randomUUID()}${ext}`;
  const dest = path.join(UPLOAD_DIR, name);

  if (!dest.startsWith(UPLOAD_DIR + path.sep)) {
    throw new UploadError("Invalid path");
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(dest, Buffer.from(await file.arrayBuffer()));
  return `/api/files/${name}`;
}
