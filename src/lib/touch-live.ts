export type TouchKind = "pollution" | "health" | "joy";

export type TouchMote = {
  id: string;
  kind: TouchKind;
  x: number;
  y: number;
};

export type TouchSnap = {
  meters: { clean: number; health: number; joy: number };
  motes: TouchMote[];
  bloom: boolean;
  taps: number;
};

export const SAMPLE_TOUCH = {
  slug: "yesil-dokunus",
  title: "Yeşil Dokunuş",
  description:
    "Telefonundan dumanı, hastalığı ve üzüntüyü dokunarak temizle. Duvar ekranında kent yeşerir, toplum sağlığı yükselir, yüzler gülümser.",
  gift: "Birlikte iyileşen kent — en çok dokunan rumuzlar öne çıkar",
  location: "Sağlık Pavilionu — Etkileşim alanı",
  seconds: 75,
};

type World = {
  gameId: string;
  live: boolean;
  meters: { clean: number; health: number; joy: number };
  motes: TouchMote[];
  scores: Map<string, number>;
  seq: number;
  flushed: boolean;
};

const worlds = new Map<string, World>();
const TARGET = 12;

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function nid(world: World) {
  world.seq += 1;
  return `m${world.seq.toString(36)}`;
}

function mixKind(i: number): TouchKind {
  const r = i % 10;
  if (r < 4) return "pollution";
  if (r < 7) return "health";
  return "joy";
}

function place(kind: TouchKind, i: number): TouchMote {
  const x = 10 + ((i * 17 + kind.length * 9) % 80);
  const y = 30 + ((i * 23 + 11) % 52);
  return { id: "", kind, x, y };
}

function fill(world: World) {
  let i = world.seq;
  while (world.motes.length < TARGET) {
    const mote = place(mixKind(i), i);
    mote.id = nid(world);
    world.motes.push(mote);
    i += 1;
  }
}

export function resetTouchWorld(gameId: string) {
  const world: World = {
    gameId,
    live: true,
    meters: { clean: 14, health: 16, joy: 12 },
    motes: [],
    scores: new Map(),
    seq: 0,
    flushed: false,
  };
  fill(world);
  worlds.set(gameId, world);
  return snapshotTouch(gameId);
}

export function stopTouchWorld(gameId: string) {
  const world = worlds.get(gameId);
  if (world) world.live = false;
}

export function snapshotTouch(gameId: string): TouchSnap | null {
  const world = worlds.get(gameId);
  if (!world) return null;
  const { clean, health, joy } = world.meters;
  return {
    meters: { ...world.meters },
    motes: world.motes.map((m) => ({ ...m })),
    bloom: clean >= 80 && health >= 80 && joy >= 80,
    taps: [...world.scores.values()].reduce((s, n) => s + n, 0),
  };
}

export function tapTouch(gameId: string, moteId: string, playerId: string) {
  const world = worlds.get(gameId);
  if (!world || !world.live) return { ok: false as const, reason: "Tur kapalı" };
  const idx = world.motes.findIndex((m) => m.id === moteId);
  if (idx < 0) return { ok: false as const, reason: "kaçtı" };
  const hit = world.motes[idx];
  world.motes.splice(idx, 1);
  if (hit.kind === "pollution") world.meters.clean = clamp(world.meters.clean + 5);
  if (hit.kind === "health") world.meters.health = clamp(world.meters.health + 5);
  if (hit.kind === "joy") world.meters.joy = clamp(world.meters.joy + 5);
  world.scores.set(playerId, (world.scores.get(playerId) || 0) + 1);
  fill(world);
  return { ok: true as const, kind: hit.kind, snap: snapshotTouch(gameId)! };
}

export function touchScores(gameId: string) {
  const world = worlds.get(gameId);
  if (!world) return [];
  return [...world.scores.entries()].map(([playerId, taps]) => ({ playerId, taps }));
}

export function takeTouchFlush(gameId: string) {
  const world = worlds.get(gameId);
  if (!world || world.flushed) return [];
  world.flushed = true;
  world.live = false;
  return touchScores(gameId);
}
