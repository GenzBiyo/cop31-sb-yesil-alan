import { prisma } from "./prisma";

export const EVENT_CREDITS_KEY = "eventCredits";
export const DEFAULT_CREDIT_BEFORE = "Katıldığınız bu etkinlik";
export const DEFAULT_CREDIT_AFTER = "tarafından desteklenmiştir.";

export type EventCredit = {
  id: string;
  name: string;
  before: string;
  after: string;
  logoPath: string;
  from: string;
  to: string;
};

const clip = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const WHEN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/** Antalya clock as `YYYY-MM-DDTHH:mm`, comparable with the dashboard fields. */
export function antalyaStamp(now = new Date()) {
  return new Date(now.getTime() + 3 * 3600 * 1000).toISOString().slice(0, 16);
}

export function parseEventCredits(raw: string | null | undefined): EventCredit[] {
  try {
    const list = JSON.parse(raw || "[]");
    if (!Array.isArray(list)) return [];
    return list
      .map((row) => ({
        id: clip(row?.id, 40),
        name: clip(row?.name, 80),
        before: clip(row?.before, 120),
        after: clip(row?.after, 120),
        logoPath: clip(row?.logoPath, 240),
        from: clip(row?.from, 16),
        to: clip(row?.to, 16),
      }))
      .filter((row) => row.id && row.logoPath.startsWith("/uploads/sponsors/"));
  } catch {
    return [];
  }
}

export function creditError(row: Pick<EventCredit, "before" | "from" | "to">) {
  if (!row.before) return "Logo öncesi yazıyı girin";
  if (!WHEN.test(row.from) || !WHEN.test(row.to)) return "Başlangıç ve bitiş saatini seçin";
  if (row.from >= row.to) return "Bitiş, başlangıçtan sonra olmalı";
  return "";
}

export async function readEventCredits() {
  const setting = await prisma.setting.findUnique({ where: { key: EVENT_CREDITS_KEY } });
  return parseEventCredits(setting?.value);
}

export async function writeEventCredits(rows: EventCredit[]) {
  const value = JSON.stringify(rows);
  await prisma.setting.upsert({
    where: { key: EVENT_CREDITS_KEY },
    update: { value },
    create: { key: EVENT_CREDITS_KEY, value },
  });
}

export function activeEventCredits(rows: EventCredit[], now = new Date()) {
  const stamp = antalyaStamp(now);
  return rows.filter((row) => row.from <= stamp && stamp < row.to);
}
