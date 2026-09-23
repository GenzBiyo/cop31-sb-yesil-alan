import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api";
import { parsePlayerMap, PLAYER_COOKIE, startSpin, stopSpin } from "@/lib/games";
import { parseWheelView } from "@/lib/wheel";
import { touchGame } from "@/lib/game-live";

export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const game = await prisma.game.findUnique({
    where: { slug },
    select: { id: true, type: true, published: true, status: true, phase: true, view: true, lockedTeamId: true },
  });
  if (!game || !game.published) return jsonError("Oyun yok", 404);
  if (game.type !== "wheel") return jsonError("Bu oyun çark değil");
  if (game.status === "draft") return jsonError("Oyun henüz açılmadı");
  if (game.status === "closed") return jsonError("Oyun kapandı");

  const jar = await cookies();
  const token = parsePlayerMap(jar.get(PLAYER_COOKIE)?.value)[game.id];
  if (!token) return jsonError("Önce rumuzla katıl", 401);
  const me = await prisma.gamePlayer.findUnique({
    where: { token },
    select: { id: true, gameId: true, status: true },
  });
  if (!me || me.gameId !== game.id) return jsonError("Oyuncu bulunamadı", 401);
  if (me.status !== "approved") return jsonError("Rumuzun onaylanınca çevirebilirsin");

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "spin");
  const motion = parseWheelView(game.view);

  try {
    if (action === "stop") {
      if (game.phase === "asking" && game.lockedTeamId && game.lockedTeamId !== me.id) {
        return jsonError("Sıra sende değil");
      }
      const hint = Number(body.fromAngle);
      await stopSpin(game.id, Number.isFinite(hint) ? hint : undefined);
    } else {
      if (game.phase === "asking" && (motion.mode === "coast" || motion.mode === "stop")) {
        return jsonError("Çark dönüyor, bitsin");
      }
      await startSpin(game.id, me.id);
    }
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Çark çevrilemedi");
  }

  touchGame(true);
  return jsonOk({ ok: true });
}
