import { randomBytes } from "crypto";
import { prisma } from "./prisma";
import { SAMPLE_WHEEL, WHEEL_COAST_MAX_SEC, WHEEL_STOP_SEC, parseWheelView, wheelCoastAngle, wheelStopTarget, wheelViewFor } from "./wheel";
import { SAMPLE_MATCH } from "./match-cards";
import { SAMPLE_KILO } from "./kilo-carbon";
import { SAMPLE_HATIRA } from "./hatira";
import { resetMatchRound, stopMatchRound, takeMatchFlush } from "./match-live";
import { memoClear } from "./memo";

export const PLAYER_COOKIE = "cop31_player";
export const TEAM_COLORS = ["#22A34A", "#00A3E0", "#0077C2", "#E31C23", "#0f766e", "#5EC8F0"];

export const GAME_STATUS: Record<string, string> = {
  draft: "Taslak",
  lobby: "Lobi — rumuz onayı",
  live: "Canlı",
  closed: "Kapandı",
};

export type QuestionDraft = {
  id?: string;
  prompt: string;
  options: string[];
  answer: number;
  points: number;
  seconds?: number;
  videoUrl?: string;
  videoPath?: string;
};

export const SAMPLE_QUIZ = {
  slug: "iklim-saglik-soru-cevap",
  title: "İklim ve Sağlık — Soru Cevap",
  description:
    "Karekodu okut, rumuzunu seç. Admin onaylayınca duvarda görünürsün. Beş soruda iklimin sağlıkla bağını kur.",
  gift: "Birinci ödül: COP31 Sağlık Pavilionu iklim-sağlık hediye seti (matara + bez çanta)",
  location: "Sağlık Pavilionu — Etkileşim alanı",
  teams: ["Yeşil Yaprak", "Mavi Nefes", "Toprak Kalp", "Güneş Kalbi"],
  questions: [
    {
      prompt: "Aşırı sıcak dalgasında sağlığı korumak için ilk adım nedir?",
      options: [
        "Bol su, gölge ve serin saatlerde dışarı çıkmak",
        "Daha kalın giyinmek",
        "Tuz hapı almak",
        "Egzersizi öğlene almak",
      ],
      answer: 0,
      points: 10,
      seconds: 15,
    },
    {
      prompt: "Sıcak ve hava kirliliğinden en çok kimler etkilenir?",
      options: [
        "Yaşlılar, çocuklar ve kronik solunum/kalp hastaları",
        "Yalnızca sporcular",
        "Yalnızca genç yetişkinler",
        "Yalnızca kıyı kentlerinde oturanlar",
      ],
      answer: 0,
      points: 10,
      seconds: 15,
    },
    {
      prompt: "Fosil yakıt dumanı iklimi ve sağlığı nasıl bağlar?",
      options: [
        "Aynı emisyon hem gezegeni ısıtır hem akciğeri bozar",
        "Duman yalnızca kışın zararlıdır",
        "İklim ısınınca hava kendiliğinden temizlenir",
        "Maske iklim değişikliğini durdurur",
      ],
      answer: 0,
      points: 10,
      seconds: 15,
    },
    {
      prompt: "Sıfır atık neden bir sağlık konusudur?",
      options: [
        "Atık, mikroplastik ve kirli su gıdayı ve içme suyunu bozar",
        "Atık yalnızca görüntü sorunudur",
        "Geri dönüşüm sağlığı olumsuz etkiler",
        "Plastik vücutta parçalanmaz ama zararsızdır",
      ],
      answer: 0,
      points: 10,
      seconds: 15,
    },
    {
      prompt: "Kentteki yeşil alanın doğrudan sağlık etkisi nedir?",
      options: [
        "Isıyı düşürür, stresi azaltır, hareketi artırır",
        "Yalnızca kent estetiğidir",
        "Sivrisinek dışında etkisi yoktur",
        "Kapalı spor salonunun yerini tutmaz, gereksizdir",
      ],
      answer: 0,
      points: 10,
      seconds: 15,
    },
  ] satisfies QuestionDraft[],
};

export function slugify(input: string) {
  return input
    .replace(/İ/g, "i")
    .replace(/I/g, "i")
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "oyun";
}

export function newPlayerToken() {
  return randomBytes(24).toString("hex");
}

export function parsePlayerMap(raw?: string | null): Record<string, string> {
  try {
    const v = JSON.parse(raw || "{}");
    if (v && typeof v === "object") return v as Record<string, string>;
  } catch {
    /* ignore */
  }
  return {};
}

export function parseOptions(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

const sampleFlag = globalThis as unknown as { sampleQuizReadyV3?: boolean };

async function syncSampleQuizQuestions() {
  const quiz = await prisma.game.findUnique({
    where: { slug: SAMPLE_QUIZ.slug },
    select: { id: true, _count: { select: { questions: true } } },
  });
  if (!quiz || quiz._count.questions === SAMPLE_QUIZ.questions.length) return;
  await prisma.gameQuestion.deleteMany({ where: { gameId: quiz.id } });
  await prisma.gameQuestion.createMany({
    data: SAMPLE_QUIZ.questions.map((q, i) => ({
      gameId: quiz.id,
      order: i,
      prompt: q.prompt,
      options: JSON.stringify(q.options),
      answer: q.answer,
      points: q.points,
      seconds: q.seconds || 15,
    })),
  });
  memoClear("public-games");
}

export async function resetQuizPlay(gameId: string) {
  const questions = await prisma.gameQuestion.findMany({ where: { gameId }, select: { id: true } });
  if (questions.length) {
    await prisma.gameAnswer.deleteMany({ where: { questionId: { in: questions.map((q) => q.id) } } });
  }
  await prisma.gamePlayer.updateMany({
    where: { gameId },
    data: { score: 0, bonus: 0, winner: false },
  });
  return prisma.game.update({
    where: { id: gameId },
    data: {
      status: "lobby",
      phase: "lobby",
      currentIndex: -1,
      questionStartedAt: null,
      pausedAt: null,
      view: "question",
      winnerPlayerId: null,
      awardedAt: null,
      lockedTeamId: "",
    },
  });
}

export async function ensureSampleGames() {
  if (sampleFlag.sampleQuizReadyV3) return null;
  const needed = [SAMPLE_QUIZ.slug, SAMPLE_WHEEL.slug, SAMPLE_MATCH.slug, SAMPLE_KILO.slug, SAMPLE_HATIRA.slug];
  const existing = await prisma.game.count({ where: { slug: { in: needed } } });
  if (existing >= needed.length) {
    await syncSampleQuizQuestions();
    sampleFlag.sampleQuizReadyV3 = true;
    return null;
  }
  let quiz = await prisma.game.findUnique({ where: { slug: SAMPLE_QUIZ.slug } });
  if (quiz) {
    if (quiz.status === "live" && quiz.currentIndex < 0) {
      quiz = await prisma.game.update({
        where: { id: quiz.id },
        data: { status: "lobby", phase: "lobby", view: "question" },
      });
    }
  } else {
    quiz = await prisma.game.create({
      data: {
        slug: SAMPLE_QUIZ.slug,
        title: SAMPLE_QUIZ.title,
        type: "quiz",
        description: SAMPLE_QUIZ.description,
        gift: SAMPLE_QUIZ.gift,
        location: SAMPLE_QUIZ.location,
        status: "lobby",
        phase: "lobby",
        currentIndex: -1,
        seconds: 15,
        view: "question",
        published: true,
        questions: {
          create: SAMPLE_QUIZ.questions.map((q, i) => ({
            order: i,
            prompt: q.prompt,
            options: JSON.stringify(q.options),
            answer: q.answer,
            points: q.points,
            seconds: q.seconds || 15,
          })),
        },
        teams: {
          create: SAMPLE_QUIZ.teams.map((name, i) => ({
            name,
            color: TEAM_COLORS[i % TEAM_COLORS.length],
          })),
        },
      },
    });
  }
  const wheel = await prisma.game.findUnique({ where: { slug: SAMPLE_WHEEL.slug } });
  if (!wheel) {
    await prisma.game.create({
      data: {
        slug: SAMPLE_WHEEL.slug,
        title: SAMPLE_WHEEL.title,
        type: "wheel",
        description: SAMPLE_WHEEL.description,
        gift: SAMPLE_WHEEL.gift,
        location: SAMPLE_WHEEL.location,
        status: "lobby",
        phase: "lobby",
        currentIndex: -1,
        seconds: 6,
        view: "question",
        published: true,
        slices: {
          create: SAMPLE_WHEEL.slices.map((s, i) => ({
            order: i,
            label: s.label,
            color: s.color,
            kind: s.kind,
          })),
        },
      },
    });
  }
  const matchGame = await prisma.game.findUnique({ where: { slug: SAMPLE_MATCH.slug } });
  if (!matchGame) {
    await prisma.game.create({
      data: {
        slug: SAMPLE_MATCH.slug,
        title: SAMPLE_MATCH.title,
        type: "match",
        description: SAMPLE_MATCH.description,
        gift: SAMPLE_MATCH.gift,
        location: SAMPLE_MATCH.location,
        status: "lobby",
        phase: "lobby",
        currentIndex: -1,
        seconds: SAMPLE_MATCH.seconds,
        view: "question",
        published: true,
      },
    });
  } else if (matchGame.type !== "match") {
    await prisma.game.update({ where: { id: matchGame.id }, data: { type: "match", title: SAMPLE_MATCH.title, description: SAMPLE_MATCH.description } });
  }
  await ensureKiloGame();
  await ensureHatiraGame();
  await syncWheelSliceColors();
  await syncSampleQuizQuestions();
  sampleFlag.sampleQuizReadyV3 = true;
  return quiz;
}

async function syncWheelSliceColors() {
  const wheel = await prisma.game.findUnique({
    where: { slug: SAMPLE_WHEEL.slug },
    include: { slices: { orderBy: { order: "asc" } } },
  });
  if (!wheel?.slices.length) return;
  await Promise.all(
    wheel.slices.map((slice, i) => {
      const color = SAMPLE_WHEEL.slices[i % SAMPLE_WHEEL.slices.length].color;
      if (slice.color === color) return Promise.resolve();
      return prisma.gameSlice.update({ where: { id: slice.id }, data: { color } });
    }),
  );
}

async function ensureKiloGame() {
  const kiloGame = await prisma.game.findUnique({ where: { slug: SAMPLE_KILO.slug } });
  if (!kiloGame) {
    await prisma.game.create({
      data: {
        slug: SAMPLE_KILO.slug,
        title: SAMPLE_KILO.title,
        type: "kilo",
        description: SAMPLE_KILO.description,
        gift: SAMPLE_KILO.gift,
        location: SAMPLE_KILO.location,
        status: "lobby",
        phase: "lobby",
        currentIndex: -1,
        seconds: SAMPLE_KILO.seconds,
        view: "question",
        published: true,
      },
    });
  } else if (kiloGame.type !== "kilo") {
    await prisma.game.update({
      where: { id: kiloGame.id },
      data: { type: "kilo", title: SAMPLE_KILO.title, description: SAMPLE_KILO.description },
    });
  }
}

async function ensureHatiraGame() {
  const hatiraGame = await prisma.game.findUnique({ where: { slug: SAMPLE_HATIRA.slug } });
  if (!hatiraGame) {
    await prisma.game.create({
      data: {
        slug: SAMPLE_HATIRA.slug,
        title: SAMPLE_HATIRA.title,
        type: "hatira",
        description: SAMPLE_HATIRA.description,
        gift: SAMPLE_HATIRA.gift,
        location: SAMPLE_HATIRA.location,
        status: "lobby",
        phase: "lobby",
        currentIndex: -1,
        seconds: SAMPLE_HATIRA.seconds,
        view: "question",
        published: true,
      },
    });
  } else if (hatiraGame.type !== "hatira") {
    await prisma.game.update({
      where: { id: hatiraGame.id },
      data: { type: "hatira", title: SAMPLE_HATIRA.title, description: SAMPLE_HATIRA.description },
    });
  }
}

export async function recomputePlayerScore(playerId: string) {
  const player = await prisma.gamePlayer.findUnique({
    where: { id: playerId },
    include: { answers: true },
  });
  if (!player) return null;
  const earned = player.answers.reduce((sum, a) => sum + a.points, 0);
  const score = Math.max(0, earned + player.bonus);
  return prisma.gamePlayer.update({ where: { id: playerId }, data: { score } });
}

export async function gameBoard(gameId: string) {
  const players = await prisma.gamePlayer.findMany({
    where: { gameId, status: "approved" },
    select: {
      id: true,
      nickname: true,
      teamId: true,
      score: true,
      bonus: true,
      winner: true,
      createdAt: true,
      team: { select: { id: true, name: true, color: true } },
    },
  });
  const ranked = [...players].sort((a, b) => b.score - a.score || a.createdAt.getTime() - b.createdAt.getTime());
  const teamMap = new Map<string, { id: string; name: string; color: string; score: number; members: number }>();
  for (const p of ranked) {
    if (!p.team) continue;
    const cur = teamMap.get(p.team.id) || {
      id: p.team.id,
      name: p.team.name,
      color: p.team.color,
      score: 0,
      members: 0,
    };
    cur.score += p.score;
    cur.members += 1;
    teamMap.set(p.team.id, cur);
  }
  const teams = [...teamMap.values()].sort((a, b) => b.score - a.score);
  return {
    players: ranked.map((p, i) => ({
      id: p.id,
      rank: i + 1,
      nickname: p.nickname,
      teamId: p.teamId,
      teamName: p.team?.name || "Takımsız",
      teamColor: p.team?.color || "#57534e",
      score: p.score,
      bonus: p.bonus,
      answered: 0,
      winner: p.winner,
    })),
    teams,
  };
}

export function nextTeamColor(used: string[]) {
  return TEAM_COLORS.find((c) => !used.includes(c)) || TEAM_COLORS[used.length % TEAM_COLORS.length];
}

export type GameClock = {
  id: string;
  status: string;
  phase: string;
  currentIndex: number;
  questionStartedAt: Date | null;
  pausedAt: Date | null;
  seconds: number;
  view: string;
  type?: string;
  lockedTeamId?: string;
  spinAngle?: number;
};

export function remainingMs(game: GameClock, now = Date.now()) {
  if (game.phase !== "asking" || !game.questionStartedAt) return 0;
  const end = game.questionStartedAt.getTime() + game.seconds * 1000;
  const freeze = game.pausedAt ? game.pausedAt.getTime() : now;
  return Math.max(0, end - freeze);
}

export function remainingSec(game: GameClock, now = Date.now()) {
  return Math.ceil(remainingMs(game, now) / 1000);
}

export async function expireIfNeeded(gameId: string, known?: GameClock | null) {
  const game = known || (await prisma.game.findUnique({ where: { id: gameId } }));
  if (!game) return null;
  if (game.phase !== "asking" || game.pausedAt || remainingMs(game) > 0) return game;
  if (game.type === "wheel" && parseWheelView(game.view).mode === "coast") {
    try {
      return await stopSpin(game.id, undefined, game);
    } catch {
      return game;
    }
  }
  await prisma.game.updateMany({
    where: { id: game.id, phase: "asking" },
    data: { phase: "reveal", view: "question", pausedAt: null },
  });
  const revealed = { ...game, phase: "reveal", view: "question", pausedAt: null };
  if (game.type === "match") await flushMatchGame(game.id);
  if (game.type === "wheel" && game.lockedTeamId && game.currentIndex >= 0) {
    const slices = await prisma.gameSlice.findMany({ where: { gameId: game.id }, orderBy: { order: "asc" } });
    const slice = slices[game.currentIndex];
    if (slice?.kind === "prize") {
      await prisma.gamePlayer.updateMany({
        where: { id: game.lockedTeamId, gameId: game.id },
        data: { winner: true },
      });
      await prisma.game.update({
        where: { id: game.id },
        data: { winnerPlayerId: game.lockedTeamId, awardedAt: new Date() },
      });
    }
  }
  return revealed;
}

async function pickSpinPlayer(gameId: string, playerId?: string) {
  let chosen = String(playerId || "");
  if (chosen) {
    const ok = await prisma.gamePlayer.findFirst({
      where: { id: chosen, gameId, status: "approved" },
      select: { id: true },
    });
    if (!ok) chosen = "";
  }
  if (!chosen) {
    const pool = await prisma.gamePlayer.findMany({
      where: { gameId, status: "approved" },
      select: { id: true },
    });
    if (pool.length) chosen = pool[Math.floor(Math.random() * pool.length)].id;
  }
  return chosen;
}

export async function startSpin(gameId: string, playerId?: string) {
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) throw new Error("Oyun yok");
  const slices = await prisma.gameSlice.count({ where: { gameId } });
  if (slices < 2) throw new Error("En az iki çark dilimi ekleyin");
  const motion = parseWheelView(game.view);
  if (game.phase === "asking" && !game.pausedAt && (motion.mode === "coast" || motion.mode === "stop")) {
    throw new Error("Çark dönüyor, bitsin");
  }
  const chosen = await pickSpinPlayer(gameId, playerId);
  const rest = game.spinAngle > 100000 ? ((game.spinAngle % 360) + 360) % 360 : game.spinAngle;
  return prisma.game.update({
    where: { id: gameId },
    data: {
      status: "live",
      phase: "asking",
      currentIndex: -1,
      questionStartedAt: new Date(),
      pausedAt: null,
      view: wheelViewFor("coast"),
      seconds: WHEEL_COAST_MAX_SEC,
      spinAngle: rest,
      lockedTeamId: chosen,
    },
  });
}

export async function stopSpin(gameId: string, fromHint?: number, known?: GameClock | null) {
  const game = known || (await prisma.game.findUnique({ where: { id: gameId } }));
  if (!game) throw new Error("Oyun yok");
  const motion = parseWheelView(game.view);
  if (game.phase === "asking" && motion.mode === "stop") return game;
  if (game.phase !== "asking" || motion.mode !== "coast") {
    throw new Error("Önce çarkı çevirin");
  }
  const slices = await prisma.gameSlice.findMany({
    where: { gameId },
    orderBy: { order: "asc" },
    select: { id: true },
  });
  if (slices.length < 2) throw new Error("En az iki çark dilimi ekleyin");
  const started = game.questionStartedAt || new Date();
  const computed = wheelCoastAngle(game.spinAngle || 0, started);
  const from = Number.isFinite(fromHint) ? Math.round(Number(fromHint)) : computed;
  const index = Math.floor(Math.random() * slices.length);
  const target = wheelStopTarget(from, index, slices.length);
  return prisma.game.update({
    where: { id: gameId },
    data: {
      status: "live",
      phase: "asking",
      currentIndex: index,
      questionStartedAt: new Date(),
      pausedAt: null,
      view: wheelViewFor("stop", from),
      seconds: WHEEL_STOP_SEC,
      spinAngle: target,
    },
  });
}

export async function questionResults(gameId: string, questionId: string) {
  const [players, question] = await Promise.all([
    prisma.gamePlayer.findMany({
      where: { gameId, status: "approved" },
      include: { team: true, answers: { where: { questionId } } },
      orderBy: { nickname: "asc" },
    }),
    prisma.gameQuestion.findUnique({ where: { id: questionId } }),
  ]);
  const row = (p: (typeof players)[number]) => ({
    id: p.id,
    nickname: p.nickname,
    teamName: p.team?.name || "Takımsız",
    teamColor: p.team?.color || "#57534e",
    choice: p.answers[0]?.choice ?? null,
  });
  return {
    correctIndex: question?.answer ?? 0,
    correct: players.filter((p) => p.answers[0]?.correct).map(row),
    wrong: players.filter((p) => p.answers[0] && !p.answers[0].correct).map(row),
    unanswered: players.filter((p) => !p.answers[0]).map(row),
    answered: players.filter((p) => p.answers[0]).length,
    total: players.length,
  };
}

export async function flushMatchGame(gameId: string) {
  stopMatchRound(gameId);
  const rows = takeMatchFlush(gameId);
  for (const row of rows) {
    if (!row.taps) continue;
    await prisma.gamePlayer.updateMany({
      where: { id: row.playerId, gameId },
      data: { score: { increment: row.taps } },
    });
  }
}

export async function startMatch(gameId: string, round: 0 | 1) {
  await flushMatchGame(gameId);
  const game = await prisma.game.findUnique({ where: { id: gameId }, select: { seconds: true } });
  resetMatchRound(gameId, round === 0 ? "memory" : "pairs", round === 1);
  const seconds = Math.max(30, Math.min(180, game?.seconds || 75));
  return prisma.game.update({
    where: { id: gameId },
    data: {
      status: "live",
      phase: "asking",
      currentIndex: round,
      questionStartedAt: new Date(),
      pausedAt: null,
      view: "question",
      seconds,
    },
  });
}

export async function startQuestion(gameId: string, index: number) {
  const questions = await prisma.gameQuestion.findMany({
    where: { gameId },
    orderBy: { order: "asc" },
    select: { seconds: true },
  });
  const seconds = Math.max(5, Math.min(180, questions[index]?.seconds || 15));
  return prisma.game.update({
    where: { id: gameId },
    data: {
      status: "live",
      phase: "asking",
      currentIndex: index,
      questionStartedAt: new Date(),
      pausedAt: null,
      view: "question",
      seconds,
    },
  });
}
