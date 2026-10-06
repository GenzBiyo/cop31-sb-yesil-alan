import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; sqliteReady?: boolean };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

globalForPrisma.prisma = prisma;

async function tuneSqlite() {
  if (globalForPrisma.sqliteReady) return;
  try {
    await prisma.$queryRawUnsafe("PRAGMA journal_mode=WAL");
    await prisma.$queryRawUnsafe("PRAGMA busy_timeout=20000");
    await prisma.$queryRawUnsafe("PRAGMA synchronous=NORMAL");
    await prisma.$queryRawUnsafe("PRAGMA cache_size=-32000");
    await prisma.$queryRawUnsafe("PRAGMA temp_store=MEMORY");
    await prisma.$queryRawUnsafe("PRAGMA wal_autocheckpoint=1000");
    globalForPrisma.sqliteReady = true;
  } catch {
    /* ignore */
  }
}

void tuneSqlite();
