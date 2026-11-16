import { PrismaClient } from "@prisma/client";
import path from "path";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function localSqliteUrl(): string {
  return `file:${path.join(process.cwd(), "prisma", "dev.db")}`;
}

function databaseUrl(): string {
  const url = process.env.DATABASE_URL ?? localSqliteUrl();
  if (url.includes("pooler.supabase.com") && !url.includes("pgbouncer=true")) {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}pgbouncer=true&connection_limit=1`;
  }
  return url;
}

export function insensitive() {
  const url = process.env.DATABASE_URL;
  return url && !url.startsWith("file:") ? { mode: "insensitive" as const } : {};
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: databaseUrl(),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
