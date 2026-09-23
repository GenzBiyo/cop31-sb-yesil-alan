import { prisma } from "./prisma";
import { broadcast } from "./realtime";
import { memoClear } from "./memo";
import { expireIfNeeded, gameBoard, parseOptions, questionResults, remainingSec } from "./games";
import { snapshotMatch } from "./match-live";
import { snapshotKilo } from "./kilo-live";
import { snapshotHatira } from "./hatira-live";
import { parseHatiraLogos, type HatiraLogos } from "./hatira";
import { describeWheel } from "./wheel";

export type SharedGame = {
  id: string;
  slug: string;
  title: string;
  description: string;
  gift: string;
  location: string;
  status: string;
  phase: string;
  view: string;
  type: string;
  currentIndex: number;
  total: number;
  seconds: number;
  remaining: number;
  paused: boolean;
  questionStartedAt: Date | string | null;
  spinAngle: number;
  wheelMode: import("./wheel").WheelMode;
  spinFrom: number;
  slices: { id: string; label: string; color: string; kind: string }[];
  spinPlayer: { id: string; nickname: string } | null;
  landed: { label: string; kind: string; color: string } | null;
  touch: import("./touch-live").TouchSnap | null;
  question: {
    id: string;
    index: number;
    prompt: string;
    options: string[];
    points: number;
    seconds?: number;
    videoUrl?: string;
    videoPath?: string;
    correctIndex: number | null;
  } | null;
  results: {
    correct?: { id: string; nickname: string; teamName: string }[];
    wrong?: { id: string; nickname: string; teamName: string }[];
    unanswered?: { id: string; nickname: string; teamName: string }[];
    answered: number;
    total: number;
  } | null;
  board: Awaited<ReturnType<typeof gameBoard>> | null;
  teams: { id: string; name: string; color: string; members: number }[];
  winner: { nickname: string; score: number; teamName: string; gift: string } | null;
  match: ReturnType<typeof snapshotMatch>;
  kilo: ReturnType<typeof snapshotKilo> | null;
  hatira: Awaited<ReturnType<typeof snapshotHatira>> | null;
  logos: HatiraLogos | null;
};

type CacheRow = { at: number; data: SharedGame };

const cache = new Map<string, CacheRow>();
const inflight = new Map<string, Promise<SharedGame | null>>();
let gameTimer: ReturnType<typeof setTimeout> | null = null;

export function invalidateGameCache() {
  cache.clear();
}

export function touchGame(urgent = false) {
  invalidateGameCache();
  memoClear("public-games");
  if (urgent) {
    if (gameTimer) {
      clearTimeout(gameTimer);
      gameTimer = null;
    }
    broadcast({ type: "game" });
    return;
  }
  if (gameTimer) return;
  gameTimer = setTimeout(() => {
    gameTimer = null;
    broadcast({ type: "game" });
  }, 180);
}

async function loadPlay(slug: string): Promise<SharedGame | null> {
  const found = await prisma.game.findUnique({
    where: { slug },
    include: {
      questions: {
        orderBy: { order: "asc" },
        select: { id: true, order: true, prompt: true, options: true, points: true, answer: true, seconds: true, videoUrl: true, videoPath: true },
      },
      slices: { orderBy: { order: "asc" }, select: { id: true, label: true, color: true, kind: true } },
      teams: { orderBy: { createdAt: "asc" }, select: { id: true, name: true, color: true } },
    },
  });
  if (!found || !found.published) return null;
  const before = found.phase;
  const game = (await expireIfNeeded(found.id, found)) || found;
  if (before === "asking" && game.phase === "reveal") broadcast({ type: "game" });

  const questions = found.questions;
  const q = game.type === "wheel" || game.type === "match" || game.type === "kilo" || game.type === "hatira" ? null : game.currentIndex >= 0 ? questions[game.currentIndex] : null;
  const showReveal = game.phase === "reveal" || game.phase === "closed";
  const landed = game.type === "wheel" && game.currentIndex >= 0 ? found.slices[game.currentIndex] || null : null;
  const wheel = describeWheel(game);
  const [approvedCount, answered, spinPlayer] = await Promise.all([
    prisma.gamePlayer.count({ where: { gameId: game.id, status: "approved" } }),
    q ? prisma.gameAnswer.count({ where: { questionId: q.id } }) : Promise.resolve(0),
    game.lockedTeamId
      ? prisma.gamePlayer.findUnique({ where: { id: game.lockedTeamId }, select: { id: true, nickname: true } })
      : Promise.resolve(null),
  ]);

  return {
    id: game.id,
    slug: game.slug,
    title: game.title,
    description: game.description,
    gift: game.gift,
    location: game.location,
    status: game.status,
    phase: game.phase,
    view: game.view,
    type: game.type,
    currentIndex: game.currentIndex,
    total: game.type === "wheel" ? found.slices.length : game.type === "match" ? 2 : questions.length,
    seconds: game.seconds,
    remaining: remainingSec(game),
    paused: Boolean(game.pausedAt),
    questionStartedAt: game.questionStartedAt,
    spinAngle: game.spinAngle,
    wheelMode: wheel.mode,
    spinFrom: wheel.from,
    slices: found.slices,
    spinPlayer: spinPlayer && spinPlayer.id === game.lockedTeamId ? spinPlayer : null,
    landed: landed ? { label: landed.label, kind: landed.kind, color: landed.color } : null,
    question: q
      ? {
          id: q.id,
          index: game.currentIndex,
          prompt: q.prompt,
          options: parseOptions(q.options),
          points: q.points,
          seconds: q.seconds,
          videoUrl: q.videoUrl,
          videoPath: q.videoPath,
          correctIndex: showReveal ? q.answer : null,
        }
      : null,
    results: q ? { answered, total: approvedCount } : null,
    board: null,
    teams: found.teams.map((t) => ({ id: t.id, name: t.name, color: t.color, members: 0 })),
    winner: null,
    match: game.type === "match" ? snapshotMatch(game.id) : null,
    kilo: game.type === "kilo" ? snapshotKilo(game.id) : null,
    hatira: game.type === "hatira" ? await snapshotHatira(game.id) : null,
    logos: game.type === "hatira" ? parseHatiraLogos(game.logoPath) : null,
  };
}

async function loadWall(slug: string): Promise<SharedGame | null> {
  const play = await loadPlay(slug);
  if (!play) return null;
  const showReveal = play.phase === "reveal" || play.phase === "closed";
  const [board, details] = await Promise.all([
    gameBoard(play.id),
    play.question && showReveal ? questionResults(play.id, play.question.id) : Promise.resolve(null),
  ]);
  const winner = board.players.find((p) => p.winner) || null;
  return {
    ...play,
    teams: play.teams.map((t) => ({
      ...t,
      members: board.teams.find((b) => b.id === t.id)?.members || 0,
    })),
    results: showReveal && details
      ? { correct: details.correct, wrong: details.wrong, unanswered: details.unanswered, answered: details.answered, total: details.total }
      : play.results,
    board,
    winner: winner ? { nickname: winner.nickname, score: winner.score, teamName: winner.teamName, gift: play.gift } : null,
  };
}

export async function getSharedGame(slug: string, wall: boolean) {
  const key = `${slug}:${wall ? "wall" : "play"}`;
  const ttl = wall ? 900 : 700;
  const hit = cache.get(key);
  const pending = inflight.get(key);
  const load = async () => {
    const data = await (wall ? loadWall(slug) : loadPlay(slug));
    if (data?.type === "match") data.match = snapshotMatch(data.id);
    if (data?.type === "kilo") data.kilo = snapshotKilo(data.id);
    if (data?.type === "hatira") data.hatira = await snapshotHatira(data.id);
    return data;
  };
  if (hit && Date.now() - hit.at < ttl) {
    if (hit.data.type === "match") hit.data.match = snapshotMatch(hit.data.id);
    if (hit.data.type === "kilo") hit.data.kilo = snapshotKilo(hit.data.id);
    if (hit.data.type === "hatira") hit.data.hatira = await snapshotHatira(hit.data.id);
    return hit.data;
  }
  if (pending) return pending;
  const work = load()
    .then((data) => {
      if (data) cache.set(key, { at: Date.now(), data });
      return data;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, work);
  return work;
}
