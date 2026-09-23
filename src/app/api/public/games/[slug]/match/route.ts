import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api";
import { parsePlayerMap, PLAYER_COOKIE } from "@/lib/games";
import { flipMemory, pickPair, takePendingScore } from "@/lib/match-live";
import { touchGame } from "@/lib/game-live";

export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const game = await prisma.game.findUnique({
    where: { slug },
    select: { id: true, type: true, published: true, phase: true },
  });
  if (!game || !game.published) return jsonError("Oyun yok", 404);
  if (game.type !== "match") return jsonError("Bu oyun eşleştirme değil");
  if (game.phase !== "asking") return jsonError("Tur henüz açık değil");

  const jar = await cookies();
  const token = parsePlayerMap(jar.get(PLAYER_COOKIE)?.value)[game.id];
  if (!token) return jsonError("Önce rumuzla katıl", 401);
  const me = await prisma.gamePlayer.findUnique({
    where: { token },
    select: { id: true, gameId: true, status: true },
  });
  if (!me || me.gameId !== game.id) return jsonError("Oyuncu bulunamadı", 401);
  if (me.status !== "approved") return jsonError("Rumuzun onaylanınca oynayabilirsin");

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "flip");
  const result =
    action === "pick"
      ? pickPair(game.id, me.id, body.side === "right" ? "right" : "left", String(body.itemId || ""))
      : flipMemory(game.id, me.id, String(body.cardId || ""));
  if (!result.ok) return jsonError(result.reason || "Tur kapalı", 409);
  const gained = result.gained || 0;
  if (gained) {
    const extra = takePendingScore(me.id, game.id);
    if (extra) {
      await prisma.gamePlayer.update({
        where: { id: me.id },
        data: { score: { increment: extra } },
      });
    }
    touchGame(false);
  }
  return jsonOk({ view: result.view, gained });
}
