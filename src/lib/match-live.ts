import { byIds, MATCH_IDS, MEMORY_IDS, type MeterKind } from "./match-cards";

export type MatchMode = "memory" | "pairs";

export type MemCard = {
  id: string;
  pairId: string;
  text: string;
  up: boolean;
  done: boolean;
};

export type PairItem = { id: string; pairId: string; text: string; done: boolean };

export type PlayerMatchView = {
  mode: MatchMode;
  score: number;
  cards?: MemCard[];
  left?: PairItem[];
  right?: PairItem[];
  pickedLeft?: string | null;
  pickedRight?: string | null;
  last?: "ok" | "bad" | null;
  remainingPairs: number;
};

export type MatchPublic = {
  mode: MatchMode;
  meters: { clean: number; health: number; joy: number };
  bloom: boolean;
  solved: string[];
  totalPairs: number;
};

type PlayerMem = {
  cards: MemCard[];
  open: string[];
  lockUntil: number;
  score: number;
  last: "ok" | "bad" | null;
};

type PlayerPairs = {
  left: PairItem[];
  right: PairItem[];
  pickedLeft: string | null;
  pickedRight: string | null;
  score: number;
  last: "ok" | "bad" | null;
};

type World = {
  mode: MatchMode;
  live: boolean;
  meters: { clean: number; health: number; joy: number };
  solved: Set<string>;
  mem: Map<string, PlayerMem>;
  pairs: Map<string, PlayerPairs>;
  pending: Map<string, number>;
  flushed: boolean;
};

const g = globalThis as typeof globalThis & { __cop31MatchWorlds?: Map<string, World> };
const worlds = g.__cop31MatchWorlds || (g.__cop31MatchWorlds = new Map());
export const MATCH_POINTS = 10;

function shuffle<T>(list: T[]) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function bump(world: World, meter: MeterKind) {
  world.meters[meter] = Math.max(0, Math.min(100, world.meters[meter] + 8));
}

function addScore(world: World, playerId: string, n: number) {
  world.pending.set(playerId, (world.pending.get(playerId) || 0) + n);
}

function meterOf(pairId: string): MeterKind {
  const row = byIds([pairId])[0];
  return row?.meter || "health";
}

export function resetMatchRound(gameId: string, mode: MatchMode, keepProgress = false) {
  const prev = keepProgress ? worlds.get(gameId) : undefined;
  worlds.set(gameId, {
    mode,
    live: true,
    meters: prev ? { ...prev.meters } : { clean: 18, health: 16, joy: 14 },
    solved: prev ? new Set(prev.solved) : new Set(),
    mem: new Map(),
    pairs: new Map(),
    pending: new Map(),
    flushed: false,
  });
}

export function stopMatchRound(gameId: string) {
  const w = worlds.get(gameId);
  if (w) w.live = false;
}

export function snapshotMatch(gameId: string): MatchPublic | null {
  const w = worlds.get(gameId);
  if (!w) return null;
  return {
    mode: w.mode,
    meters: { ...w.meters },
    bloom: w.meters.clean >= 80 && w.meters.health >= 80 && w.meters.joy >= 80,
    solved: [...w.solved],
    totalPairs: w.mode === "memory" ? MEMORY_IDS.length : MATCH_IDS.length,
  };
}

function ensureMem(world: World, playerId: string) {
  let board = world.mem.get(playerId);
  if (board) {
    if (Date.now() >= board.lockUntil && board.open.length === 2) {
      const [a, b] = board.open.map((id) => board!.cards.find((c) => c.id === id)!);
      if (a && b && a.pairId !== b.pairId) {
        a.up = false;
        b.up = false;
      }
      board.open = [];
    }
    return board;
  }
  const cards: MemCard[] = [];
  byIds(MEMORY_IDS).forEach((p) => {
    cards.push({ id: `${p.id}-a`, pairId: p.id, text: p.short, up: false, done: false });
    cards.push({ id: `${p.id}-b`, pairId: p.id, text: p.hint, up: false, done: false });
  });
  board = { cards: shuffle(cards), open: [], lockUntil: 0, score: 0, last: null };
  world.mem.set(playerId, board);
  return board;
}

function ensurePairs(world: World, playerId: string) {
  let board = world.pairs.get(playerId);
  if (board) return board;
  const src = byIds(MATCH_IDS);
  board = {
    left: shuffle(src.map((p) => ({ id: `${p.id}-l`, pairId: p.id, text: p.short, done: false }))),
    right: shuffle(src.map((p) => ({ id: `${p.id}-r`, pairId: p.id, text: p.hint, done: false }))),
    pickedLeft: null,
    pickedRight: null,
    score: 0,
    last: null,
  };
  world.pairs.set(playerId, board);
  return board;
}

export function playerMatchView(gameId: string, playerId: string): PlayerMatchView | null {
  const w = worlds.get(gameId);
  if (!w) return null;
  if (w.mode === "memory") {
    const b = ensureMem(w, playerId);
    return {
      mode: "memory",
      score: b.score,
      cards: b.cards,
      last: b.last,
      remainingPairs: b.cards.filter((c) => !c.done && c.id.endsWith("-a")).length,
    };
  }
  const b = ensurePairs(w, playerId);
  return {
    mode: "pairs",
    score: b.score,
    left: b.left,
    right: b.right,
    pickedLeft: b.pickedLeft,
    pickedRight: b.pickedRight,
    last: b.last,
    remainingPairs: b.left.filter((x) => !x.done).length,
  };
}

export function flipMemory(gameId: string, playerId: string, cardId: string) {
  const w = worlds.get(gameId);
  if (!w || !w.live || w.mode !== "memory") return { ok: false as const, reason: "Tur kapalı" };
  const b = ensureMem(w, playerId);
  if (Date.now() < b.lockUntil) return { ok: true as const, view: playerMatchView(gameId, playerId)!, gained: 0 };
  const card = b.cards.find((c) => c.id === cardId);
  if (!card || card.done || card.up) return { ok: true as const, view: playerMatchView(gameId, playerId)!, gained: 0 };
  if (b.open.length >= 2) return { ok: true as const, view: playerMatchView(gameId, playerId)!, gained: 0 };
  card.up = true;
  b.open.push(card.id);
  b.last = null;
  let gained = 0;
  if (b.open.length === 2) {
    const [a, c] = b.open.map((id) => b.cards.find((x) => x.id === id)!);
    if (a.pairId === c.pairId) {
      a.done = true;
      c.done = true;
      b.open = [];
      b.score += MATCH_POINTS;
      gained = MATCH_POINTS;
      addScore(w, playerId, MATCH_POINTS);
      bump(w, meterOf(a.pairId));
      w.solved.add(a.pairId);
      b.last = "ok";
    } else {
      b.lockUntil = Date.now() + 850;
      b.last = "bad";
    }
  }
  return { ok: true as const, view: playerMatchView(gameId, playerId)!, gained };
}

export function pickPair(gameId: string, playerId: string, side: "left" | "right", itemId: string) {
  const w = worlds.get(gameId);
  if (!w || !w.live || w.mode !== "pairs") return { ok: false as const, reason: "Tur kapalı" };
  const b = ensurePairs(w, playerId);
  const item = (side === "left" ? b.left : b.right).find((x) => x.id === itemId);
  if (!item || item.done) return { ok: true as const, view: playerMatchView(gameId, playerId)!, gained: 0 };
  if (side === "left") b.pickedLeft = itemId;
  else b.pickedRight = itemId;
  b.last = null;
  let gained = 0;
  if (b.pickedLeft && b.pickedRight) {
    const L = b.left.find((x) => x.id === b.pickedLeft)!;
    const R = b.right.find((x) => x.id === b.pickedRight)!;
    if (L.pairId === R.pairId) {
      L.done = true;
      R.done = true;
      b.score += MATCH_POINTS;
      gained = MATCH_POINTS;
      addScore(w, playerId, MATCH_POINTS);
      bump(w, meterOf(L.pairId));
      w.solved.add(L.pairId);
      b.last = "ok";
    } else {
      b.last = "bad";
    }
    b.pickedLeft = null;
    b.pickedRight = null;
  }
  return { ok: true as const, view: playerMatchView(gameId, playerId)!, gained };
}

export function takeMatchFlush(gameId: string) {
  const w = worlds.get(gameId);
  if (!w || w.flushed) return [];
  w.flushed = true;
  w.live = false;
  return [...w.pending.entries()].map(([playerId, taps]) => ({ playerId, taps }));
}

export function takePendingScore(playerId: string, gameId: string) {
  const w = worlds.get(gameId);
  if (!w) return 0;
  const n = w.pending.get(playerId) || 0;
  w.pending.set(playerId, 0);
  return n;
}
