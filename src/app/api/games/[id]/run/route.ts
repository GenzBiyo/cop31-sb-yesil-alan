import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { expireIfNeeded, flushMatchGame, gameBoard, resetQuizPlay, startMatch, startQuestion, startSpin, stopSpin } from "@/lib/games";
import { touchGame } from "@/lib/game-live";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");
  let game = await expireIfNeeded(id);
  if (!game) return jsonError("Oyun yok", 404);
  const count = await prisma.gameQuestion.count({ where: { gameId: id } });
  const slices = await prisma.gameSlice.count({ where: { gameId: id } });
  const isWheel = game.type === "wheel";
  const isMatch = game.type === "match";

  if (isMatch && (action === "start" || action === "resume" || action === "next" || action === "memory" || action === "pairs")) {
    if (action === "next") {
      if (game.currentIndex <= 0 && game.phase !== "lobby") {
        game = await startMatch(id, 1);
      } else if (game.currentIndex >= 1) {
        game = await prisma.game.update({
          where: { id },
          data: { status: "closed", phase: "closed", view: "board", pausedAt: null },
        });
      } else {
        game = await startMatch(id, 0);
      }
    } else if (action === "pairs") {
      game = await startMatch(id, 1);
    } else {
      game = await startMatch(id, 0);
    }
  } else if (isWheel && action === "resume" && game.phase === "asking" && game.pausedAt && game.questionStartedAt) {
    const frozen = game.pausedAt.getTime() - game.questionStartedAt.getTime();
    game = await prisma.game.update({
      where: { id },
      data: { pausedAt: null, questionStartedAt: new Date(Date.now() - frozen) },
    });
  } else if (action === "spin" || (isWheel && (action === "start" || action === "next" || action === "resume"))) {
    if (slices < 2) return jsonError("Önce çarka en az iki hediye dilimi ekleyin");
    try {
      game = await startSpin(id, String(body.playerId || ""));
    } catch (e) {
      return jsonError(e instanceof Error ? e.message : "Çark çevrilemedi");
    }
  } else if (isWheel && action === "stop") {
    try {
      const hint = Number(body.fromAngle);
      game = await stopSpin(id, Number.isFinite(hint) ? hint : undefined);
    } catch (e) {
      return jsonError(e instanceof Error ? e.message : "Çark durdurulamadı");
    }
  } else if (action === "start" || action === "restart") {
    if (count < 1) return jsonError("Önce soru ekleyin");
    if (action === "restart" || game.phase === "closed" || game.phase === "lobby" || game.currentIndex < 0) {
      await resetQuizPlay(id);
      game = await startQuestion(id, 0);
    } else {
      game = await startQuestion(id, game.currentIndex);
    }
  } else if (action === "stop") {
    if (game.phase === "asking" && !game.pausedAt) {
      game = await prisma.game.update({ where: { id }, data: { pausedAt: new Date() } });
    }
  } else if (action === "resume") {
    if (game.phase === "asking" && game.pausedAt && game.questionStartedAt) {
      const frozen = game.pausedAt.getTime() - game.questionStartedAt.getTime();
      game = await prisma.game.update({
        where: { id },
        data: { pausedAt: null, questionStartedAt: new Date(Date.now() - frozen) },
      });
    } else if (game.phase === "lobby" || game.currentIndex < 0) {
      if (count < 1) return jsonError("Önce soru ekleyin");
      game = await startQuestion(id, 0);
    }
  } else if (action === "reveal") {
    if (isMatch) await flushMatchGame(id);
    game = await prisma.game.update({
      where: { id },
      data: { phase: "reveal", view: "question", pausedAt: null, status: "live" },
    });
  } else if (action === "next") {
    if (game.phase === "closed") {
      /* already finished */
    } else {
      const next = Math.max(game.currentIndex, 0) + 1;
      if (next >= count) {
        game = await prisma.game.update({
          where: { id },
          data: { status: "closed", phase: "closed", view: "board", pausedAt: null },
        });
      } else {
        game = await startQuestion(id, next);
      }
    }
  } else if (action === "board") {
    game = await prisma.game.update({ where: { id }, data: { view: "board" } });
  } else if (action === "question") {
    game = await prisma.game.update({ where: { id }, data: { view: "question" } });
  } else if (action === "lobby") {
    if (isMatch) await flushMatchGame(id);
    if (!isWheel && !isMatch) {
      game = await resetQuizPlay(id);
    } else {
      game = await prisma.game.update({
        where: { id },
        data: {
          status: "lobby",
          phase: "lobby",
          currentIndex: -1,
          questionStartedAt: null,
          pausedAt: null,
          view: "question",
        },
      });
    }
  } else {
    return jsonError("Geçersiz komut");
  }

  touchGame(true);
  return jsonOk({
    id: game.id,
    status: game.status,
    phase: game.phase,
    currentIndex: game.currentIndex,
    view: game.view,
    paused: Boolean(game.pausedAt),
    board: await gameBoard(id),
  });
}
