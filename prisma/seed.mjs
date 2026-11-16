import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const SAMPLE_VIDEOS = [
  {
    url: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
    title: "Big Buck Bunny (4K)",
    description:
      "The classic Blender open movie. A big rabbit takes revenge on three rodents. Streamed via YouTube embed — BlameTV stores only the link and metadata.",
    category: "Entertainment",
    tags: "animation, blender, open movie, 4k",
  },
  {
    url: "https://www.youtube.com/watch?v=eRsGyueVLvQ",
    title: "Sintel — Blender Open Movie",
    description:
      "A girl's quest to find her dragon. Third open movie by the Blender Foundation.",
    category: "Entertainment",
    tags: "animation, blender, fantasy, short film",
  },
  {
    url: "https://www.youtube.com/watch?v=R6MlUcmOul8",
    title: "Tears of Steel — Sci-Fi Short Film",
    description: "Live-action sci-fi VFX short from the Blender Institute.",
    category: "Technology",
    tags: "sci-fi, vfx, blender, short film",
  },
  {
    url: "https://www.youtube.com/watch?v=WhWc3b3KhnY",
    title: "Spring — Blender Open Movie",
    description: "A shepherd girl deals with spirits in this fantasy short.",
    category: "Entertainment",
    tags: "animation, blender, fantasy",
  },
  {
    url: "https://www.youtube.com/watch?v=TLkA0RELQ1g",
    title: "Elephants Dream — Blender Open Movie",
    description: "The world's first open movie, made entirely with free software.",
    category: "Other",
    tags: "animation, blender, open source",
  },
];

async function main() {
  console.log("Seeding BlameTV…");

  const passwordHash = await bcrypt.hash("ChangeMe123!", 12);

  const admin = await db.user.upsert({
    where: { email: "admin@blametv.example" },
    update: {},
    create: {
      email: "admin@blametv.example",
      username: "admin",
      displayName: "BlameTV Admin",
      bio: "Official BlameTV account.",
      role: "ADMIN",
      passwordHash,
    },
  });

  const demo = await db.user.upsert({
    where: { email: "demo@blametv.example" },
    update: {},
    create: {
      email: "demo@blametv.example",
      username: "demo",
      displayName: "Demo Channel",
      bio: "This is a demo channel with sample content.",
      role: "USER",
      passwordHash,
    },
  });

  const created = [];
  for (const v of SAMPLE_VIDEOS) {
    const idMatch = /[?&]v=([A-Za-z0-9_-]+)/.exec(v.url);
    const ytId = idMatch ? idMatch[1] : null;

    const video = await db.video.create({
      data: {
        title: v.title,
        description: v.description,
        category: v.category,
        tags: v.tags,
        videoUrl: null,
        embedUrl: `https://www.youtube-nocookie.com/embed/${ytId}`,
        thumbnailUrl: ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : null,
        source: "YOUTUBE",
        visibility: "PUBLIC",
        views: Math.floor(Math.random() * 5000),
        ownerId: Math.random() > 0.5 ? admin.id : demo.id,
      },
    });
    created.push(video);
  }

  await db.comment.create({
    data: {
      body: "This platform looks great! Loving the dark theme.",
      videoId: created[0].id,
      authorId: demo.id,
    },
  });

  await db.comment.create({
    data: {
      body: "Reply: agreed, the recommendations are surprisingly good.",
      videoId: created[0].id,
      authorId: admin.id,
    },
  });

  await db.subscription
    .create({ data: { subscriberId: demo.id, channelId: admin.id } })
    .catch(() => {});

  await db.videoLike
    .create({ data: { userId: demo.id, videoId: created[0].id, value: 1 } })
    .catch(() => {});

  console.log(`Seeded ${created.length} videos, 2 users.`);
  console.log("Admin login: admin@blametv.example / ChangeMe123!");
  console.log("Demo login:  demo@blametv.example / ChangeMe123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
