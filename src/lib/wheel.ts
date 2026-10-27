import { SLICE_BRAND } from "./brand";

export const SLICE_COLORS = [...SLICE_BRAND];

export type SliceDraft = {
  id?: string;
  label: string;
  color: string;
  kind: "prize" | "again" | "miss";
  /** Göreli ağırlık. Dilimler 462+308+123+77+15+15 = 1000 ise oran yüzde onda biridir. */
  weight?: number;
};

/** Çark ödülleri. Ağırlıklar binde: 462 → %46,2. */
export const WHEEL_PRIZES: { label: string; weight: number }[] = [
  { label: "Tohum kartı", weight: 462 },
  { label: "Tohumlu kalem", weight: 308 },
  { label: "Bez çanta", weight: 123 },
  { label: "Bambu termos", weight: 77 },
  { label: "Bluetooth Speaker", weight: 15 },
  { label: "Hoparlör + kulaklık", weight: 15 },
];

export const WHEEL_COAST_DEG_PER_MS = 0.52;
export const WHEEL_COAST_MAX_SEC = 25;
export const WHEEL_STOP_SEC = 7;

export type WheelMode = "idle" | "coast" | "stop";

export type WheelMotion = {
  mode: WheelMode;
  from: number;
  target: number;
  startedAt: string | Date | null | undefined;
  seconds: number;
};

export const SAMPLE_WHEEL = {
  slug: "hediye-carki",
  title: "Hediyeli Çark",
  description: "Karekodu okut, Çevir’e bas. Çark dönünce Durdur ile yavaş yavaş dursun.",
  gift: "Tohum kartı, tohumlu kalem, bez çanta, bambu termos, bluetooth speaker, hoparlör ve kulaklık",
  location: "Sağlık Pavilionu — Etkileşim alanı",
  slices: WHEEL_PRIZES.map((prize, i) => ({
    label: prize.label,
    color: SLICE_BRAND[i % SLICE_BRAND.length],
    kind: "prize" as const,
    weight: prize.weight,
  })),
};

export function sliceWeight(slice: { weight?: number } | null | undefined) {
  const weight = Number(slice?.weight);
  return Number.isFinite(weight) && weight > 0 ? weight : 1;
}

export function wheelArcs(slices: { weight?: number }[]) {
  const weights = (slices.length ? slices : [{ weight: 1 }]).map(sliceWeight);
  const total = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  let cursor = 0;
  return weights.map((weight) => {
    const start = cursor;
    const arc = (weight / total) * 360;
    cursor += arc;
    return { start, arc, mid: start + arc / 2 };
  });
}

export function pickWeightedIndex(slices: { weight?: number }[], rand = Math.random()) {
  const weights = (slices.length ? slices : [{ weight: 1 }]).map(sliceWeight);
  const total = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  let mark = Math.min(0.999999, Math.max(0, rand)) * total;
  for (let i = 0; i < weights.length; i += 1) {
    mark -= weights[i];
    if (mark < 0) return i;
  }
  return weights.length - 1;
}

/** Yüzdeyi, diğer dilimlerin ağırlığı sabitken bu dilimin payı yapar. */
export function weightForShare(percent: number, othersWeight: number) {
  const share = Math.min(99.9, Math.max(0.1, percent)) / 100;
  const others = Math.max(1, othersWeight);
  return Math.max(1, Math.round((share / (1 - share)) * others));
}

export function cleanSlices(raw: unknown): SliceDraft[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row, i) => {
      const item = row as SliceDraft;
      const kind = item.kind === "again" || item.kind === "miss" ? item.kind : "prize";
      return {
        id: item.id,
        label: String(item.label || "").trim(),
        color: String(item.color || SLICE_COLORS[i % SLICE_COLORS.length]).trim() || SLICE_COLORS[i % SLICE_COLORS.length],
        kind,
        weight: sliceWeight(item),
      };
    })
    .filter((s) => s.label);
}

function landSlice(index: number, slicesOrCount: { weight?: number }[] | number) {
  if (typeof slicesOrCount === "number") {
    const count = Math.max(1, slicesOrCount);
    const arc = 360 / count;
    const safe = ((index % count) + count) % count;
    return { mid: safe * arc + arc / 2, arc };
  }
  const arcs = wheelArcs(slicesOrCount);
  return arcs[Math.min(Math.max(index, 0), arcs.length - 1)] || { mid: 0, arc: 360 };
}

export function wheelLandAngle(index: number, slicesOrCount: { weight?: number }[] | number, extraTurns = 6, jitter = 0) {
  const { mid, arc } = landSlice(index, slicesOrCount);
  const wobble = Math.max(-arc * 0.32, Math.min(arc * 0.32, jitter));
  return Math.round(extraTurns * 360 + (360 - mid) + wobble);
}

export function wheelLandMod(index: number, slicesOrCount: { weight?: number }[] | number, jitter = 0) {
  return ((wheelLandAngle(index, slicesOrCount, 0, jitter) % 360) + 360) % 360;
}

export function wheelCoastAngle(from: number, startedAt: Date | string, now = Date.now()) {
  const start = new Date(startedAt).getTime();
  return Math.round(from + Math.max(0, now - start) * WHEEL_COAST_DEG_PER_MS);
}

export function wheelStopTarget(from: number, index: number, slicesOrCount: { weight?: number }[] | number) {
  const { arc } = landSlice(index, slicesOrCount);
  const jitter = (Math.random() - 0.5) * arc * 0.45;
  const land = wheelLandMod(index, slicesOrCount, jitter);
  const fromMod = ((from % 360) + 360) % 360;
  let delta = (land - fromMod + 360) % 360;
  const minDelta = 5 * 360 + 40;
  while (delta < minDelta) delta += 360;
  return Math.round(from + delta);
}

export function parseWheelView(view?: string | null): { mode: WheelMode; from: number } {
  const raw = String(view || "");
  if (raw === "spin") return { mode: "coast", from: 0 };
  if (raw.startsWith("stop:")) {
    const from = Number(raw.slice(5));
    return { mode: "stop", from: Number.isFinite(from) ? from : 0 };
  }
  return { mode: "idle", from: 0 };
}

export function wheelViewFor(mode: WheelMode, from = 0) {
  if (mode === "coast") return "spin";
  if (mode === "stop") return `stop:${Math.round(from)}`;
  return "question";
}

export function describeWheel(game: {
  type?: string;
  phase?: string;
  view?: string;
  spinAngle?: number;
  questionStartedAt?: string | Date | null;
  seconds?: number;
}): WheelMotion {
  const angle = Math.round(game.spinAngle || 0);
  const startedAt = game.questionStartedAt || null;
  const seconds = game.seconds || WHEEL_STOP_SEC;
  if (game.type && game.type !== "wheel") {
    return { mode: "idle", from: angle, target: angle, startedAt, seconds };
  }
  if (game.phase !== "asking") {
    const parsed = parseWheelView(game.view);
    const start = startedAt ? new Date(startedAt).getTime() : 0;
    const dur = (game.seconds || WHEEL_STOP_SEC) * 1000;
    if (parsed.mode === "stop" && start && Date.now() < start + dur + 400) {
      return { mode: "stop", from: parsed.from, target: angle, startedAt, seconds: game.seconds || WHEEL_STOP_SEC };
    }
    return { mode: "idle", from: angle, target: angle, startedAt, seconds };
  }
  const parsed = parseWheelView(game.view);
  if (parsed.mode === "coast") {
    return { mode: "coast", from: angle, target: angle, startedAt, seconds: game.seconds || WHEEL_COAST_MAX_SEC };
  }
  if (parsed.mode === "stop") {
    return { mode: "stop", from: parsed.from, target: angle, startedAt, seconds: game.seconds || WHEEL_STOP_SEC };
  }
  return { mode: "stop", from: 0, target: angle, startedAt, seconds };
}

export function sliceKindLabel(kind: string) {
  if (kind === "again") return "Tekrar çevir";
  if (kind === "miss") return "Bu tur hediye yok";
  return "Hediye";
}
