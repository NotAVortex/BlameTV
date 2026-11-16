const MAX_ANIMATED_AVATAR_MS = 5000;
const MAX_ANIMATED_BANNER_MS = 10000;

export function animationDurationMs(buf: Buffer, mime: string): number {
  if (mime === "image/gif") return gifDurationMs(buf);
  if (mime === "image/webp") return webpDurationMs(buf);
  return 0;
}

function gifDurationMs(buf: Buffer): number {
  if (buf.length < 13 || buf.toString("ascii", 0, 3) !== "GIF") return 0;
  let i = 13;
  let delayCs = 0;
  let frames = 0;

  while (i < buf.length - 1) {
    const block = buf[i];
    if (block === 0x21 && buf[i + 1] === 0xf9 && i + 8 <= buf.length) {
      frames += 1;
      delayCs += buf.readUInt16LE(i + 4);
      i += 8;
      i = skipSubBlocks(buf, i);
    } else if (block === 0x21 && i + 2 <= buf.length) {
      i += 2;
      i = skipSubBlocks(buf, i);
    } else if (block === 0x2c) {
      i = skipImageDescriptor(buf, i + 9);
    } else if (block === 0x3b) {
      break;
    } else {
      i += 1;
    }
  }

  if (frames < 2) return 0;
  return delayCs * 10;
}

function skipSubBlocks(buf: Buffer, i: number): number {
  while (i < buf.length) {
    const size = buf[i];
    i += 1;
    if (size === 0) break;
    i += size;
  }
  return i;
}

function skipImageDescriptor(buf: Buffer, i: number): number {
  if (i >= buf.length) return buf.length;
  const flags = buf[i - 1];
  let pos = i;
  if (flags & 0x80) pos += 3 * (1 << ((flags & 0x07) + 1));
  if (pos >= buf.length) return buf.length;
  pos += 1;
  return skipSubBlocks(buf, pos);
}

function webpDurationMs(buf: Buffer): number {
  if (buf.length < 30 || buf.toString("ascii", 0, 4) !== "RIFF") return 0;
  if (buf.toString("ascii", 8, 12) !== "WEBP") return 0;

  let i = 12;
  let totalMs = 0;
  let frames = 0;

  while (i + 8 <= buf.length) {
    const tag = buf.toString("ascii", i, i + 4);
    const size = buf.readUInt32LE(i + 4);
    const dataStart = i + 8;

    if (tag === "ANMF") {
      frames += 1;
      if (dataStart + 16 <= buf.length) {
        totalMs += buf.readUIntLE(dataStart + 12, 3);
      }
    }
    i = dataStart + size + (size % 2);
  }

  if (frames < 2) return 0;
  return totalMs;
}

export function validateAnimation(
  buf: Buffer,
  mime: string,
  kind: "avatar" | "banner"
): string | null {
  const duration = animationDurationMs(buf, mime);
  const limit = kind === "avatar" ? MAX_ANIMATED_AVATAR_MS : MAX_ANIMATED_BANNER_MS;
  if (duration > limit) {
    return `Animated ${kind} too long: ${(duration / 1000).toFixed(1)}s (max ${limit / 1000}s)`;
  }
  return null;
}
