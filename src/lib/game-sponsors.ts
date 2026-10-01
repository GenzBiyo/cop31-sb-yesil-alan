import { prisma } from "@/lib/prisma";
import { COP_DATES } from "@/lib/cop-days";
import { memoClear, memoClearPrefix, memoGet, memoSet } from "@/lib/memo";

export const SPONSOR_PENDING = "Onay bekliyor";
export const SPONSOR_APPROVED = "Onaylandı";
export const SPONSOR_REJECTED = "Reddedildi";
export const SPONSOR_DONE = "Tamamlandı";
export const SPONSOR_STATUSES = [SPONSOR_PENDING, SPONSOR_APPROVED, SPONSOR_DONE, SPONSOR_REJECTED];

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Pavilion runs on Antalya time (UTC+3, no DST). */
export function sessionWindow(date: string, startTime: string, endTime: string) {
  return {
    from: new Date(`${date}T${startTime}:00+03:00`),
    to: new Date(`${date}T${endTime}:00+03:00`),
  };
}

export function validateSponsorSlot(input: { date: string; startTime: string; endTime: string }) {
  if (!COP_DATES.includes(input.date)) return "Tarih 9–20 Kasım arasında olmalı";
  if (!TIME.test(input.startTime) || !TIME.test(input.endTime)) return "Saatleri SS:DD biçiminde girin";
  if (input.startTime >= input.endTime) return "Bitiş saati başlangıçtan sonra olmalı";
  return "";
}

export async function findSponsorConflict(input: {
  id?: string;
  gameId: string;
  date: string;
  startTime: string;
  endTime: string;
}) {
  const sameDay = await prisma.gameSponsorship.findMany({
    where: {
      gameId: input.gameId,
      date: input.date,
      status: { not: SPONSOR_REJECTED },
      ...(input.id ? { NOT: { id: input.id } } : {}),
    },
    include: { company: { select: { name: true } } },
  });
  return sameDay.find((s) => s.startTime < input.endTime && input.startTime < s.endTime) || null;
}

type Row = { id: string; gameId: string; date: string; startTime: string; endTime: string };

/** Players who joined the game during each sponsored window, and how many of them won. */
export async function sponsorReach(rows: Row[]) {
  const out: Record<string, { players: number; winners: number }> = {};
  for (const row of rows) {
    const { from, to } = sessionWindow(row.date, row.startTime, row.endTime);
    const [players, winners] = await Promise.all([
      prisma.gamePlayer.count({ where: { gameId: row.gameId, createdAt: { gte: from, lt: to } } }),
      prisma.gamePlayer.count({ where: { gameId: row.gameId, winner: true, createdAt: { gte: from, lt: to } } }),
    ]);
    out[row.id] = { players, winners };
  }
  return out;
}

export type LiveSponsor = { company: string; logo: string; prize: string; endTime: string };

const norm = (s: string) => s.toLocaleLowerCase("tr").replace(/[^a-z0-9çğıöşü]/g, "");

/** Company profile logo first, otherwise a pavilion sponsor logo with the same name. */
async function sponsorLogos(companies: { name: string; logoPath: string }[]) {
  const missing = companies.filter((c) => !c.logoPath);
  const pool = missing.length ? await prisma.sponsor.findMany({ where: { logoPath: { not: "" } }, select: { name: true, logoPath: true } }) : [];
  return (c: { name: string; logoPath: string }) => {
    if (c.logoPath) return c.logoPath;
    const key = norm(c.name);
    const hit = pool.find((s) => {
      const n = norm(s.name);
      return n && (n === key || key.startsWith(n) || n.startsWith(key));
    });
    return hit?.logoPath || "";
  };
}

/** Approved sponsorship running right now for each game, keyed by gameId. */
export async function liveSponsors(now = new Date(), gameId?: string) {
  const local = new Date(now.getTime() + 3 * 3600 * 1000).toISOString();
  const date = local.slice(0, 10);
  const time = local.slice(11, 16);
  const rows = await prisma.gameSponsorship.findMany({
    where: { date, status: SPONSOR_APPROVED, startTime: { lte: time }, endTime: { gt: time }, ...(gameId ? { gameId } : {}) },
    include: { company: { select: { name: true, logoPath: true } } },
  });
  const logoOf = await sponsorLogos(rows.map((r) => r.company));
  const map: Record<string, LiveSponsor> = {};
  for (const r of rows) map[r.gameId] = { company: r.company.name, logo: logoOf(r.company), prize: r.prize, endTime: r.endTime };
  return map;
}

export function forgetLiveSponsors() {
  memoClearPrefix("game-sponsor:");
  memoClear("public-games");
}

/** Live sponsor for one game; cached briefly because walls and phones poll every few seconds. */
export async function liveSponsorFor(gameId: string): Promise<LiveSponsor | null> {
  const key = `game-sponsor:${gameId}`;
  const cached = memoGet<{ s: LiveSponsor | null }>(key, 15000);
  if (cached) return cached.s;
  const s = (await liveSponsors(new Date(), gameId))[gameId] || null;
  memoSet(key, { s });
  return s;
}
