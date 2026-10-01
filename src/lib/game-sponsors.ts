import { prisma } from "@/lib/prisma";
import { COP_DATES } from "@/lib/cop-days";

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

/** Approved sponsorship running right now for each game, keyed by gameId. */
export async function liveSponsors(now = new Date()) {
  const local = new Date(now.getTime() + 3 * 3600 * 1000).toISOString();
  const date = local.slice(0, 10);
  const time = local.slice(11, 16);
  const rows = await prisma.gameSponsorship.findMany({
    where: { date, status: SPONSOR_APPROVED, startTime: { lte: time }, endTime: { gt: time } },
    include: { company: { select: { name: true } } },
  });
  const map: Record<string, { company: string; prize: string; endTime: string }> = {};
  for (const r of rows) map[r.gameId] = { company: r.company.name, prize: r.prize, endTime: r.endTime };
  return map;
}
