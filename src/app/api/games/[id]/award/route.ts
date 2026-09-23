import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { gameBoard } from "@/lib/games";
import { touchGame } from "@/lib/game-live";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const { id } = await ctx.params;
  const game = await prisma.game.findUnique({ where: { id } });
  if (!game) return jsonError("Oyun yok", 404);
  const body = await req.json().catch(() => ({}));
  let winner = body.playerId
    ? await prisma.gamePlayer.findFirst({ where: { id: String(body.playerId), gameId: id } })
    : null;
  if (!winner) {
    winner = await prisma.gamePlayer.findFirst({
      where: { gameId: id },
      orderBy: [{ score: "desc" }, { createdAt: "asc" }],
    });
  }
  if (!winner) return jsonError("Henüz oyuncu yok");
  await prisma.gamePlayer.updateMany({ where: { gameId: id }, data: { winner: false } });
  await prisma.gamePlayer.update({ where: { id: winner.id }, data: { winner: true } });
  await prisma.game.update({
    where: { id },
    data: { winnerPlayerId: winner.id, awardedAt: new Date(), status: "closed", phase: "closed", view: "board" },
  });
  touchGame(true);
  return jsonOk({
    winner: { id: winner.id, nickname: winner.nickname, score: winner.score, gift: game.gift },
    board: await gameBoard(id),
  });
}
