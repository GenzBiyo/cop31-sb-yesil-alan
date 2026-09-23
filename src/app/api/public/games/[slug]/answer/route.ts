import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api";
import { parseOptions, parsePlayerMap, PLAYER_COOKIE, remainingMs } from "@/lib/games";
import { touchGame } from "@/lib/game-live";

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const game = await prisma.game.findUnique({
    where: { slug },
    select: {
      id: true,
      published: true,
      phase: true,
      pausedAt: true,
      currentIndex: true,
      questionStartedAt: true,
      seconds: true,
      status: true,
      view: true,
    },
  });
  if (!game || !game.published) return jsonError("Oyun yok", 404);
  if (game.phase !== "asking" || game.pausedAt) {
    return jsonError(game.phase === "lobby" ? "Oyun henüz başlamadı" : "Cevap süresi kapandı");
  }
  if (remainingMs(game) <= 0) {
    await prisma.game.updateMany({
      where: { id: game.id, phase: "asking" },
      data: { phase: "reveal", view: "question", pausedAt: null },
    });
    touchGame(true);
    return jsonError("Süre doldu");
  }

  const current = await prisma.gameQuestion.findFirst({
    where: { gameId: game.id },
    orderBy: { order: "asc" },
    skip: Math.max(0, game.currentIndex),
    select: { id: true, options: true, answer: true, points: true },
  });
  if (!current) return jsonError("Soru yok");

  const jar = await cookies();
  const token = parsePlayerMap(jar.get(PLAYER_COOKIE)?.value)[game.id];
  if (!token) return jsonError("Önce rumuz seçin");
  const player = await prisma.gamePlayer.findUnique({
    where: { token },
    select: { id: true, gameId: true, status: true, score: true },
  });
  if (!player || player.gameId !== game.id) return jsonError("Oyuncu bulunamadı");
  if (player.status !== "approved") return jsonError("Rumuzunuz henüz onaylanmadı");

  const body = await req.json();
  if (String(body.questionId || "") !== current.id) return jsonError("Bu soru artık açık değil");

  const choice = Number(body.choice);
  const options = parseOptions(current.options);
  if (!Number.isInteger(choice) || choice < 0 || choice >= options.length) {
    return jsonError("Seçim geçersiz");
  }
  const correct = choice === current.answer;
  const points = correct ? current.points : 0;

  try {
    await prisma.$transaction([
      prisma.gameAnswer.create({
        data: { playerId: player.id, questionId: current.id, choice, correct, points },
      }),
      prisma.gamePlayer.update({
        where: { id: player.id },
        data: { score: { increment: points } },
      }),
    ]);
  } catch {
    return jsonError("Bu soruyu zaten yanıtladınız");
  }

  touchGame(false);
  return jsonOk({
    locked: true,
    correct: null,
    points,
    score: player.score + points,
  });
}
