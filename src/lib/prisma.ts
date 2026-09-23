import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; sqliteReady?: boolean };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

async function tuneSqlite() {
  if (globalForPrisma.sqliteReady) return;
  try {
    await prisma.$queryRawUnsafe("PRAGMA journal_mode=WAL");
    await prisma.$queryRawUnsafe("PRAGMA busy_timeout=8000");
    await prisma.$queryRawUnsafe("PRAGMA synchronous=NORMAL");
    globalForPrisma.sqliteReady = true;
  } catch {
    /* ignore */
  }
}

void tuneSqlite();
