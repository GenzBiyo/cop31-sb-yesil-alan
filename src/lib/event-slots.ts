export type SlotKind = "normal" | "youth";

export type HourSlot = {
  start: string;
  end: string;
  kind: SlotKind;
};

export const HOUR_SLOTS: HourSlot[] = [
  { start: "09:00", end: "10:00", kind: "normal" },
  { start: "10:00", end: "11:00", kind: "normal" },
  { start: "11:00", end: "12:00", kind: "normal" },
  { start: "12:00", end: "13:00", kind: "normal" },
  { start: "13:00", end: "14:00", kind: "normal" },
  { start: "14:00", end: "15:00", kind: "normal" },
  { start: "15:00", end: "16:00", kind: "normal" },
  { start: "17:00", end: "18:00", kind: "youth" },
  { start: "18:00", end: "19:00", kind: "youth" },
];

export const NORMAL_EVENT_TYPES = ["gift-qa", "quiz", "survey", "wheel", "interactive"] as const;
export const YOUTH_EVENT_TYPES = ["quiz", "wheel", "match", "kilo", "hatira"] as const;

export type Occupied = { id?: string; date: string; startTime: string; endTime: string; approvalStatus?: string };

function minutes(hhmm: string) {
  const [h, m] = String(hhmm || "00:00").split(":").map((n) => Number(n) || 0);
  return h * 60 + m;
}

export function slotByStart(start: string) {
  return HOUR_SLOTS.find((s) => s.start === start) || null;
}

export function isYouthType(type: string) {
  return (YOUTH_EVENT_TYPES as readonly string[]).includes(type);
}

export function isNormalType(type: string) {
  return (NORMAL_EVENT_TYPES as readonly string[]).includes(type);
}

export function typesForSlot(kind: SlotKind): string[] {
  return kind === "youth" ? [...YOUTH_EVENT_TYPES] : [...NORMAL_EVENT_TYPES];
}

function overlaps(ev: Occupied, slot: HourSlot) {
  return minutes(ev.startTime) < minutes(slot.end) && minutes(ev.endTime) > minutes(slot.start);
}

export function availableSlots(date: string, occupied: Occupied[], ignoreId?: string) {
  const blocking = occupied.filter(
    (e) => e.date === date && e.id !== ignoreId && e.approvalStatus !== "Reddedildi"
  );
  return HOUR_SLOTS.filter((slot) => !blocking.some((e) => overlaps(e, slot)));
}

export function validateEventSlot(opts: {
  date: string;
  startTime: string;
  endTime: string;
  type: string;
  occupied: Occupied[];
  ignoreId?: string;
}) {
  const slot = slotByStart(opts.startTime);
  if (!slot) return "Bu saat seçilemez. Yalnızca 1 saatlik uygun slotlar kullanılır.";
  if (slot.end !== opts.endTime) return "Her slot 1 saattir.";
  const free = availableSlots(opts.date, opts.occupied, opts.ignoreId).some((s) => s.start === slot.start);
  if (!free) return "Bu slot dolu. Başka bir uygun saat seçin.";
  if (slot.kind === "youth" && !isYouthType(opts.type)) {
    return "17:00’den sonra Gençlik saati: yalnızca gençlik oyunları seçilebilir.";
  }
  if (slot.kind === "normal" && !isNormalType(opts.type)) {
    return "Bu saatte yalnızca normal etkinlikler seçilebilir. Gençlik oyunları 17:00’den sonra.";
  }
  return null;
}
