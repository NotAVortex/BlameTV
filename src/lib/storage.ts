import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
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

export function storageAvailable(): boolean {
  if (s3Config()) return true;
  return process.env.VERCEL !== "1";
}

function s3Config() {
  const endpoint = process.env.S3_ENDPOINT;
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const publicBase = process.env.S3_PUBLIC_BASE_URL;
  const region = process.env.S3_REGION ?? "auto";

  if (endpoint && bucket && accessKeyId && secretAccessKey && publicBase) {
    return { endpoint, bucket, accessKeyId, secretAccessKey, publicBase, region };
  }
  return null;
}

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
  const buffer = Buffer.from(await file.arrayBuffer());

  const s3 = s3Config();
  if (s3) {
    const client = new S3Client({
      region: s3.region,
      endpoint: s3.endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: s3.accessKeyId,
        secretAccessKey: s3.secretAccessKey,
      },
    });
    try {
      await client.send(
        new PutObjectCommand({
          Bucket: s3.bucket,
          Key: name,
          Body: buffer,
          ContentType: file.type,
        })
      );
    } catch (err) {
      console.error("S3 upload failed:", err);
      throw new UploadError(
        "Upload storage rejected the file - check the storage settings (bucket, keys, endpoint)"
      );
    }
    return `${s3.publicBase.replace(/\/$/, "")}/${name}`;
  }

  const dest = path.join(UPLOAD_DIR, name);
  if (!dest.startsWith(UPLOAD_DIR + path.sep)) {
    throw new UploadError("Invalid path");
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(dest, buffer);
  return `/api/files/${name}`;
}
