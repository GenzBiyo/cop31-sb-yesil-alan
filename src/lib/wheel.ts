import { SLICE_BRAND } from "./brand";

export const SLICE_COLORS = [...SLICE_BRAND];

export type SliceDraft = {
  id?: string;
  label: string;
  color: string;
  kind: "prize" | "again" | "miss";
};

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
  description: "Karekodu okut, rumuzunu seç. Onaylanınca Çevir’e bas; çark dönünce Durdur ile yavaş yavaş dursun.",
  gift: "Pavilion hediyeleri: bez çanta, matara, rozet, tohum kartı, iklim defteri",
  location: "Sağlık Pavilionu — Etkileşim alanı",
  slices: [
    { label: "Bez çanta", color: SLICE_BRAND[0], kind: "prize" },
    { label: "Matara", color: SLICE_BRAND[1], kind: "prize" },
    { label: "Tekrar çevir", color: SLICE_BRAND[2], kind: "again" },
    { label: "Tohum kartı", color: SLICE_BRAND[3], kind: "prize" },
    { label: "Teşekkür", color: SLICE_BRAND[4], kind: "miss" },
    { label: "Pavilion rozeti", color: SLICE_BRAND[5], kind: "prize" },
    { label: "Tekrar çevir", color: SLICE_BRAND[6], kind: "again" },
    { label: "İklim defteri", color: SLICE_BRAND[7], kind: "prize" },
  ] satisfies SliceDraft[],
};

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
      };
    })
    .filter((s) => s.label);
}

export function wheelLandAngle(index: number, n: number, extraTurns = 6, jitter = 0) {
  const count = Math.max(1, n);
  const arc = 360 / count;
  const center = index * arc + arc / 2;
  const wobble = Math.max(-arc * 0.32, Math.min(arc * 0.32, jitter));
  return Math.round(extraTurns * 360 + (360 - center) + wobble);
}

export function wheelLandMod(index: number, n: number, jitter = 0) {
  return ((wheelLandAngle(index, n, 0, jitter) % 360) + 360) % 360;
}

export function wheelCoastAngle(from: number, startedAt: Date | string, now = Date.now()) {
  const start = new Date(startedAt).getTime();
  return Math.round(from + Math.max(0, now - start) * WHEEL_COAST_DEG_PER_MS);
}

export function wheelStopTarget(from: number, index: number, n: number) {
  const jitter = (Math.random() - 0.5) * (360 / Math.max(1, n)) * 0.45;
  const land = wheelLandMod(index, n, jitter);
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
