import { prisma } from "./prisma";
import type { HatiraPublic } from "./hatira";

export async function snapshotHatira(gameId: string): Promise<HatiraPublic> {
  const [shots, pending] = await Promise.all([
    prisma.gamePlayer.findMany({
      where: { gameId, status: "approved", photoPath: { not: "" } },
      orderBy: { createdAt: "desc" },
      take: 24,
      select: { id: true, nickname: true, photoPath: true, createdAt: true },
    }),
    prisma.gamePlayer.count({
      where: { gameId, status: "pending", photoPath: { not: "" } },
    }),
  ]);
  return {
    pending,
    shots: shots.map((s) => ({
      id: s.id,
      nickname: s.nickname,
      photoPath: s.photoPath,
      createdAt: s.createdAt.toISOString(),
    })),
  };
}
