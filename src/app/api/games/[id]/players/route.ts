import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { touchGame } from "@/lib/game-live";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const { id } = await ctx.params;
  const body = await req.json();
  const player = await prisma.gamePlayer.findFirst({
    where: { id: String(body.playerId || ""), gameId: id },
  });
  if (!player) return jsonError("Oyuncu yok", 404);
  const action = String(body.action || "");
  if (action !== "approve" && action !== "reject") return jsonError("Geçersiz işlem");
  const updated = await prisma.gamePlayer.update({
    where: { id: player.id },
    data: { status: action === "approve" ? "approved" : "rejected" },
  });
    touchGame(true);
  return jsonOk({ id: updated.id, nickname: updated.nickname, status: updated.status });
}
