import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { expireIfNeeded, gameBoard, parseOptions, SAMPLE_QUIZ, questionResults, remainingSec, type QuestionDraft } from "@/lib/games";
import { touchGame } from "@/lib/game-live";
import { SAMPLE_WHEEL, cleanSlices } from "@/lib/wheel";
import { snapshotHatira } from "@/lib/hatira-live";
import { mergeHatiraLogos, parseHatiraLogos } from "@/lib/hatira";

function clampSeconds(n: unknown) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 15;
  return Math.max(5, Math.min(180, Math.round(v)));
}

function cleanQuestions(raw: unknown): QuestionDraft[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((q, i) => {
      const row = q as QuestionDraft;
      const options = (row.options || []).map((o) => String(o || "").trim()).filter(Boolean);
      return {
        id: row.id,
        prompt: String(row.prompt || "").trim(),
        options,
        answer: Math.max(0, Math.min(Number(row.answer) || 0, Math.max(options.length - 1, 0))),
        points: Math.max(1, Number(row.points) || 10),
        seconds: clampSeconds(row.seconds),
        videoUrl: String(row.videoUrl || "").trim(),
        videoPath: String(row.videoPath || "").trim(),
        order: i,
      };
    })
    .filter((q) => q.prompt && q.options.length >= 2);
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const { id } = await ctx.params;
  const raw = await prisma.game.findUnique({
    where: { id },
    include: {
      questions: { orderBy: { order: "asc" } },
      slices: { orderBy: { order: "asc" } },
      teams: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!raw) return jsonError("Oyun yok", 404);
  const game = (await expireIfNeeded(raw.id)) || raw;
  const board = await gameBoard(game.id);
  const q = game.currentIndex >= 0 ? raw.questions[game.currentIndex] : null;
  const showReveal = game.phase === "reveal" || game.phase === "closed";
  const results = q ? await questionResults(game.id, q.id) : null;
  const pending = await prisma.gamePlayer.findMany({
    where: { gameId: game.id, status: "pending" },
    orderBy: { createdAt: "asc" },
      select: { id: true, nickname: true, createdAt: true, photoPath: true },
  });
  const roster = await prisma.gamePlayer.findMany({
    where: { gameId: game.id, status: "approved" },
    orderBy: { createdAt: "asc" },
      select: { id: true, nickname: true, score: true, photoPath: true },
  });
  return jsonOk({
    ...raw,
    status: game.status,
    phase: game.phase,
    currentIndex: game.currentIndex,
    view: game.view,
    seconds: game.seconds,
    remaining: remainingSec(game),
    paused: Boolean(game.pausedAt),
    questionStartedAt: game.questionStartedAt,
    questions: raw.questions.map((row) => ({
      id: row.id,
      prompt: row.prompt,
      options: parseOptions(row.options),
      answer: row.answer,
      points: row.points,
      seconds: row.seconds,
      videoUrl: row.videoUrl,
      videoPath: row.videoPath,
    })),
    current: q
      ? {
          id: q.id,
          index: game.currentIndex,
          prompt: q.prompt,
          options: parseOptions(q.options),
          points: q.points,
          seconds: q.seconds,
          videoUrl: q.videoUrl,
          videoPath: q.videoPath,
          answer: showReveal ? q.answer : null,
        }
      : null,
    results,
    pending,
    roster,
    board,
    slices: raw.slices,
    spinAngle: raw.spinAngle,
    spinPlayerId: game.lockedTeamId,
    hatira: raw.type === "hatira" ? await snapshotHatira(game.id) : null,
    logos: raw.type === "hatira" ? parseHatiraLogos(raw.logoPath) : null,
  });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const { id } = await ctx.params;
  const game = await prisma.game.findUnique({ where: { id } });
  if (!game) return jsonError("Oyun yok", 404);
  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const key of ["title", "description", "gift", "location", "status", "phase", "view"]) {
    if (body[key] !== undefined) data[key] = String(body[key]);
  }
  if (body.currentIndex !== undefined) data.currentIndex = Number(body.currentIndex);
  if (body.seconds !== undefined) {
    const s = Number(body.seconds);
    if (Number.isFinite(s)) data.seconds = Math.max(30, Math.min(180, Math.round(s)));
  }
  if (body.published !== undefined) data.published = Boolean(body.published);
  if (body.logoPath !== undefined) data.logoPath = String(body.logoPath);
  if (body.logos && typeof body.logos === "object") {
    data.logoPath = JSON.stringify(mergeHatiraLogos(game.logoPath, body.logos as { cop31?: string; saglik?: string }));
  }
  if (body.status && !["draft", "lobby", "live", "closed"].includes(body.status)) {
    return jsonError("Geçersiz durum");
  }
  if (Object.keys(data).length) {
    await prisma.game.update({ where: { id }, data });
  }
  if (body.loadSample && game.type === "wheel") {
    await prisma.gameSlice.deleteMany({ where: { gameId: id } });
    await prisma.gameSlice.createMany({
      data: SAMPLE_WHEEL.slices.map((s, i) => ({
        gameId: id,
        order: i,
        label: s.label,
        color: s.color,
        kind: s.kind,
      })),
    });
  } else if (body.loadSample) {
    await prisma.gameQuestion.deleteMany({ where: { gameId: id } });
    await prisma.gameQuestion.createMany({
      data: SAMPLE_QUIZ.questions.map((q, i) => ({
        gameId: id,
        order: i,
        prompt: q.prompt,
        options: JSON.stringify(q.options),
        answer: q.answer,
        points: q.points,
        seconds: q.seconds || 15,
      })),
    });
    const teamCount = await prisma.gameTeam.count({ where: { gameId: id } });
    if (teamCount === 0) {
      await prisma.gameTeam.createMany({
        data: SAMPLE_QUIZ.teams.map((name, i) => ({
          gameId: id,
          name,
          color: ["#22A34A", "#00A3E0", "#0077C2", "#E31C23"][i],
        })),
      });
    }
  } else if (Array.isArray(body.slices)) {
    const slices = cleanSlices(body.slices);
    const keep = slices.map((s) => s.id).filter(Boolean) as string[];
    await prisma.gameSlice.deleteMany({
      where: keep.length ? { gameId: id, id: { notIn: keep } } : { gameId: id },
    });
    for (const [i, s] of slices.entries()) {
      const payload = { order: i, label: s.label, color: s.color, kind: s.kind };
      if (s.id) await prisma.gameSlice.update({ where: { id: s.id }, data: payload });
      else await prisma.gameSlice.create({ data: { ...payload, gameId: id } });
    }
  } else if (Array.isArray(body.questions)) {
    const questions = cleanQuestions(body.questions);
    const keep = questions.map((q) => q.id).filter(Boolean) as string[];
    await prisma.gameQuestion.deleteMany({
      where: keep.length ? { gameId: id, id: { notIn: keep } } : { gameId: id },
    });
    for (const [i, q] of questions.entries()) {
      const payload = {
        order: i,
        prompt: q.prompt,
        options: JSON.stringify(q.options),
        answer: q.answer,
        points: q.points,
        seconds: q.seconds || 15,
        videoUrl: q.videoUrl || "",
        ...(q.videoPath !== undefined ? { videoPath: q.videoPath } : {}),
      };
      if (q.id) {
        await prisma.gameQuestion.update({ where: { id: q.id }, data: payload });
      } else {
        await prisma.gameQuestion.create({ data: { ...payload, gameId: id } });
      }
    }
  }
  touchGame(true);
  const updated = await prisma.game.findUnique({
    where: { id },
    include: { questions: { orderBy: { order: "asc" } }, slices: { orderBy: { order: "asc" } }, teams: true },
  });
  const board = await gameBoard(id);
  return jsonOk({
    ...updated,
    questions: (updated?.questions || []).map((q) => ({
      id: q.id,
      prompt: q.prompt,
      options: parseOptions(q.options),
      answer: q.answer,
      points: q.points,
      seconds: q.seconds,
      videoUrl: q.videoUrl,
      videoPath: q.videoPath,
    })),
    slices: updated?.slices || [],
    board,
  });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const { id } = await ctx.params;
  await prisma.game.delete({ where: { id } });
  touchGame(true);
  return jsonOk({ ok: true });
}
