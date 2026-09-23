import { estimateCarbon, parseKiloInput, type KiloResult, type KiloSex } from "./kilo-carbon";

export type KiloPulse = {
  id: string;
  at: number;
  sex: KiloSex;
  age: number;
  heightCm: number;
  weightKg: number;
  bmi: number;
  tonnesTo2035: number;
  tonnesYear: number;
  haze: number;
};

export type KiloPublic = {
  latest: KiloPulse | null;
  pulses: KiloPulse[];
  visitors: number;
  totalTonnes: number;
};

type World = {
  pulses: KiloPulse[];
  totalTonnes: number;
};

const g = globalThis as typeof globalThis & { __cop31KiloWorlds?: Map<string, World> };
const worlds = g.__cop31KiloWorlds || (g.__cop31KiloWorlds = new Map());

function ensure(gameId: string) {
  let w = worlds.get(gameId);
  if (!w) {
    w = { pulses: [], totalTonnes: 0 };
    worlds.set(gameId, w);
  }
  return w;
}

export function snapshotKilo(gameId: string): KiloPublic {
  const w = ensure(gameId);
  return {
    latest: w.pulses[0] || null,
    pulses: w.pulses.slice(0, 8),
    visitors: w.pulses.length,
    totalTonnes: Math.round(w.totalTonnes * 100) / 100,
  };
}

export function pushKilo(gameId: string, raw: { sex?: unknown; cinsiyet?: unknown; age?: unknown; heightCm?: unknown; weightKg?: unknown }): { result: KiloResult; pulse: KiloPulse } | { error: string } {
  const input = parseKiloInput(raw);
  if (!input) return { error: "Cinsiyet, yaş 10–90, boy 120–220 cm, kilo 30–220 kg olmalı" };
  const result = estimateCarbon(input);
  const pulse: KiloPulse = {
    id: `${Date.now().toString(36)}-${Math.floor(Math.random() * 999)}`,
    at: Date.now(),
    sex: result.sex,
    age: result.age,
    heightCm: result.heightCm,
    weightKg: result.weightKg,
    bmi: result.bmi,
    tonnesTo2035: result.tonnesTo2035,
    tonnesYear: result.tonnesYear,
    haze: result.haze,
  };
  const w = ensure(gameId);
  w.pulses.unshift(pulse);
  w.pulses = w.pulses.slice(0, 40);
  w.totalTonnes += result.tonnesTo2035;
  return { result, pulse };
}
