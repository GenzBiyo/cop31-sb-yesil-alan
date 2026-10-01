import { prisma } from "./prisma";
import { COP_DATES } from "./cop-days";

export const MEETING_PENDING = "Bekliyor";
export const MEETING_ACCEPTED = "Kabul";
export const MEETING_REJECTED = "Red";

export type SlotState = "bos" | "bekliyor" | "dolu";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function toMin(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function fromMin(total: number) {
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Antalya local time (UTC+3) as "YYYY-MM-DDTHH:MM". */
export function nowLocalKey() {
  return new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 16);
}

export function slotIsPast(slot: { date: string; startTime: string }) {
  return `${slot.date}T${slot.startTime}` <= nowLocalKey();
}

export function buildSlots(input: { dates: string[]; from: string; to: string; minutes: number; breakMinutes?: number }) {
  if (!TIME.test(input.from) || !TIME.test(input.to)) throw new Error("Saatleri SS:DD biçiminde girin");
  const minutes = Math.round(input.minutes);
  if (![15, 20, 30, 45, 60, 90].includes(minutes)) throw new Error("Görüşme süresini seçin");
  const gap = Math.max(0, Math.min(60, Math.round(input.breakMinutes || 0)));
  const start = toMin(input.from);
  const end = toMin(input.to);
  if (end - start < minutes) throw new Error("Bitiş saati başlangıçtan en az bir görüşme süresi sonra olmalı");
  const dates = [...new Set(input.dates)].filter((d) => COP_DATES.includes(d)).sort();
  if (!dates.length) throw new Error("En az bir gün seçin");
  const out: { date: string; startTime: string; endTime: string }[] = [];
  for (const date of dates) {
    for (let t = start; t + minutes <= end; t += minutes + gap) {
      out.push({ date, startTime: fromMin(t), endTime: fromMin(t + minutes) });
    }
  }
  if (out.length > 600) throw new Error("Tek seferde en fazla 600 slot oluşturulur");
  return out;
}

export function overlaps(a: { startTime: string; endTime: string }, b: { startTime: string; endTime: string }) {
  return a.startTime < b.endTime && b.startTime < a.endTime;
}

/** Status of each slot from the meeting requests attached to it. */
export async function slotStates(slotIds: string[]) {
  const map = new Map<string, { state: SlotState; pending: number; meetingId: string }>();
  if (!slotIds.length) return map;
  const rows = await prisma.meetingRequest.findMany({
    where: { slotId: { in: slotIds }, status: { in: [MEETING_PENDING, MEETING_ACCEPTED] } },
    select: { id: true, slotId: true, status: true },
  });
  for (const row of rows) {
    const cur = map.get(row.slotId) || { state: "bos" as SlotState, pending: 0, meetingId: "" };
    if (row.status === MEETING_ACCEPTED) {
      cur.state = "dolu";
      cur.meetingId = row.id;
    } else {
      cur.pending += 1;
      if (cur.state !== "dolu") cur.state = "bekliyor";
    }
    map.set(row.slotId, cur);
  }
  return map;
}

/** Upcoming, not yet filled slots per company, for the meeting request form. */
export async function openSlotsByCompany() {
  const today = nowLocalKey().slice(0, 10);
  const slots = await prisma.meetingSlot.findMany({
    where: { date: { gte: today }, company: { status: "Onaylandı" } },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
  const states = await slotStates(slots.map((s) => s.id));
  const byCompany = new Map<string, { id: string; date: string; startTime: string; endTime: string; location: string; pending: boolean }[]>();
  for (const slot of slots) {
    if (slotIsPast(slot)) continue;
    const st = states.get(slot.id);
    if (st?.state === "dolu") continue;
    const list = byCompany.get(slot.companyId) || [];
    list.push({
      id: slot.id,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      location: slot.location,
      pending: st?.state === "bekliyor",
    });
    byCompany.set(slot.companyId, list);
  }
  return byCompany;
}

/** Turns free text such as "9-10 Kasım", "9–20 November" or "9, 11 Kasım" into COP31 dates. */
export function participationDays(text: string) {
  const days = new Set<number>();
  const clean = text.replace(/[–—]/g, "-");
  for (const m of clean.matchAll(/(\d{1,2})\s*-\s*(\d{1,2})/g)) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    for (let d = Math.min(a, b); d <= Math.max(a, b); d += 1) days.add(d);
  }
  for (const m of clean.replace(/(\d{1,2})\s*-\s*(\d{1,2})/g, " ").matchAll(/\d{1,2}/g)) days.add(Number(m[0]));
  return COP_DATES.filter((date) => days.has(Number(date.slice(8, 10))));
}
