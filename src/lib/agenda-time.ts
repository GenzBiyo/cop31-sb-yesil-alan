export const DAY_START_MIN = 8 * 60;
export const DAY_END_MIN = 19 * 60;
export const TIME_SNAP = 15;

export const PAVILION_SLOTS = [
  { slotKey: "etkinlik-1", type: "Etkinlik", startTime: "09:00", endTime: "10:00", title: "Günün etkinliği", sortOrder: 10 },
  { slotKey: "sunum-1", type: "Sunum", startTime: "10:15", endTime: "11:00", title: "Sunum 1", sortOrder: 20 },
  { slotKey: "sunum-2", type: "Sunum", startTime: "11:15", endTime: "12:00", title: "Sunum 2", sortOrder: 30 },
  { slotKey: "panel-1", type: "Panel", startTime: "14:00", endTime: "15:15", title: "Panel 1", sortOrder: 40 },
  { slotKey: "panel-2", type: "Panel", startTime: "15:30", endTime: "16:45", title: "Panel 2", sortOrder: 50 },
] as const;

export function toMinutes(hhmm: string) {
  const [h, m] = String(hhmm || "00:00").split(":").map((n) => Number(n) || 0);
  return h * 60 + m;
}

export function fromMinutes(min: number) {
  const snapped = Math.round(min / TIME_SNAP) * TIME_SNAP;
  const clamped = Math.max(DAY_START_MIN, Math.min(DAY_END_MIN, snapped));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function slotInstant(date: string, time: string) {
  return new Date(`${date}T${time}:00+03:00`);
}

export function formatWhen(date: string, start: string, end: string) {
  const [y, m, d] = date.split("-");
  return `${d}.${m}.${y} ${start}–${end}`;
}

export function digits(phone: string) {
  return phone.replace(/\D/g, "");
}

export function validPhone(phone: string) {
  return digits(phone).length >= 10;
}

export function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
