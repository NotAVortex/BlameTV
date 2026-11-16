import { execSync } from "child_process";

const url = process.env.DATABASE_URL ?? "";
const schema = url.startsWith("postgres")
  ? "prisma/schema.prisma"
  : "prisma/schema.local.prisma";

console.log(`Generating Prisma client from ${schema}`);
execSync(`npx prisma generate --schema ${schema}`, { stdio: "inherit" });
