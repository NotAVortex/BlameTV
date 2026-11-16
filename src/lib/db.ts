import { PrismaClient } from "@prisma/client";
import path from "path";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function localSqliteUrl(): string {
  return `file:${path.join(process.cwd(), "prisma", "dev.db")}`;
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL ?? localSqliteUrl(),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
