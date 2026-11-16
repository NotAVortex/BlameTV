import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  username: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_-]+$/, "Letters, numbers, _ and - only"),
  displayName: z.string().trim().min(1).max(50),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128),
});

export const videoMetaSchema = z.object({
  title: z.string().trim().min(1).max(140),
  description: z.string().trim().max(5000).optional().default(""),
  category: z.string().trim().max(40).optional().default("Other"),
  tags: z.string().trim().max(500).optional().default(""),
  visibility: z.enum(["PUBLIC", "UNLISTED", "PRIVATE"]).optional().default("PUBLIC"),
});

export const videoUpdateSchema = videoMetaSchema.partial();

export const commentSchema = z.object({
  body: z.string().trim().min(1).max(2000),
  parentId: z.string().max(64).optional(),
});

export const reportSchema = z.object({
  reason: z.enum([
    "SPAM",
    "HARASSMENT",
    "HATE",
    "VIOLENCE",
    "COPYRIGHT",
    "MISINFORMATION",
    "OTHER",
  ]),
  details: z.string().trim().max(2000).optional().default(""),
  videoId: z.string().max(64).optional(),
  commentId: z.string().max(64).optional(),
});

const hexColor = z
  .union([z.string().regex(/^#[0-9a-fA-F]{6}$/), z.literal("")])
  .transform((v) => (v === "" ? null : v));

export const linksSchema = z
  .array(
    z.object({
      label: z.string().trim().min(1).max(50),
      url: z
        .string()
        .trim()
        .max(300)
        .regex(/^https:\/\/\S+$/, "Links must start with https://"),
    })
  )
  .max(5)
  .transform((v) => (v.length === 0 ? null : JSON.stringify(v)));

export const profileSchema = z.object({
  displayName: z.string().trim().min(1).max(50).optional(),
  bio: z.string().trim().max(1000).optional(),
  accentColor: hexColor.optional(),
  bgFrom: hexColor.optional(),
  bgTo: hexColor.optional(),
  pfpRing: hexColor.optional(),
  links: linksSchema.optional(),
  hideSubscriptions: z.boolean().optional(),
});

export const CATEGORIES = [
  "Gaming",
  "Music",
  "Education",
  "Technology",
  "Entertainment",
  "Sports",
  "News",
  "Comedy",
  "Other",
] as const;

export function formatZodError(error: z.ZodError): string {
  return error.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; ");
}
