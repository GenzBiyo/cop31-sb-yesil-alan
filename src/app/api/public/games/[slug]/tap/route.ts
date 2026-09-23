import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api";
import { parsePlayerMap, PLAYER_COOKIE } from "@/lib/games";
import { tapTouch } from "@/lib/touch-live";
import { touchGame } from "@/lib/game-live";

export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const game = await prisma.game.findUnique({
    where: { slug },
    select: { id: true, type: true, published: true, status: true, phase: true },
  });
  if (!game || !game.published) return jsonError("Oyun yok", 404);
  if (game.type !== "touch") return jsonError("Bu oyun dokunmatik değil");
  if (game.phase !== "asking") return jsonError("Tur henüz açık değil");

  const jar = await cookies();
  const token = parsePlayerMap(jar.get(PLAYER_COOKIE)?.value)[game.id];
  if (!token) return jsonError("Önce rumuzla katıl", 401);
  const me = await prisma.gamePlayer.findUnique({
    where: { token },
    select: { id: true, gameId: true, status: true },
  });
  if (!me || me.gameId !== game.id) return jsonError("Oyuncu bulunamadı", 401);
  if (me.status !== "approved") return jsonError("Rumuzun onaylanınca dokunabilirsin");

  const body = await req.json().catch(() => ({}));
  const moteId = String(body.moteId || "");
  if (!moteId) return jsonError("Hedef yok");
  const result = tapTouch(game.id, moteId, me.id);
  if (!result.ok) return jsonError(result.reason || "Kaçtı", 409);
  touchGame(false);
  return jsonOk({ kind: result.kind, touch: result.snap });
}
