import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api";
import { parsePlayerMap, PLAYER_COOKIE } from "@/lib/games";
import { plakMotion, PLAK_SPIN_MS } from "@/lib/plak";
import { touchGame } from "@/lib/game-live";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const game = await prisma.game.findUnique({
    where: { slug },
    include: { tracks: { orderBy: { order: "asc" } } },
  });
  if (!game || !game.published || game.type !== "plak") return jsonError("Müzik oyunu yok", 404);
  if (game.status === "draft") return jsonError("Oyun henüz açılmadı");
  if (game.status === "closed") return jsonError("Oyun kapandı");
  if (!game.tracks.length) return jsonError("Henüz parça yok");

  const motion = plakMotion(game.view, game.questionStartedAt, game.currentIndex);
  if (motion.spinning) return jsonError("Plak zaten dönüyor");

  const jar = await cookies();
  const token = parsePlayerMap(jar.get(PLAYER_COOKIE)?.value)[game.id];
  if (!token) return jsonError("Önce rumuzla katıl", 401);
  const me = await prisma.gamePlayer.findUnique({ where: { token } });
  if (!me || me.gameId !== game.id) return jsonError("Oyuncu bulunamadı", 401);
  if (me.status !== "approved") return jsonError("Rumuzun onaylanınca döndürebilirsin");

  const index = Math.floor(Math.random() * game.tracks.length);
  const track = game.tracks[index];
  const startedAt = new Date();
  await prisma.game.update({
    where: { id: game.id },
    data: {
      status: "live",
      phase: "reveal",
      currentIndex: index,
      lockedTeamId: me.id,
      questionStartedAt: startedAt,
      seconds: Math.ceil(PLAK_SPIN_MS / 1000),
      view: JSON.stringify({ plak: { startedAt: startedAt.toISOString(), index } }),
    },
  });
  touchGame(true);
  return jsonOk({
    index,
    videoId: track.videoId,
    title: track.title,
    artist: track.artist,
    nickname: me.nickname,
  });
}
