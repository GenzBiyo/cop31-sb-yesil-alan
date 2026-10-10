export const TT_SEMINER = "TT Seminer Salonu";
export const SB_SEMINER = "SB Seminer Salonu";
export const SB_PAVILYON = "SB Pavilyon";

export const VENUES = [
  {
    id: "tt",
    label: TT_SEMINER,
    hint: "En fazla 3 panel. 9 ve 10 Kasım saatleri henüz belli değil.",
  },
  {
    id: "sb-seminer",
    label: SB_SEMINER,
    hint: "Yalnızca pazartesi (9 ve 16 Kasım), 12:00–22:00.",
  },
  {
    id: "sb-pavilyon",
    label: SB_PAVILYON,
    hint: "9–20 Kasım. Sınır yok. Aynı yerde saatler üst üste gelemez.",
  },
] as const;

export const COP_FIRST = "2026-11-09";
export const COP_LAST = "2026-11-20";
const TT_OPEN_CLOCK = new Set(["2026-11-09", "2026-11-10"]);
const SB_SEMINER_START = 12 * 60;
const SB_SEMINER_END = 22 * 60;

export function sessionKind(typeOrKind: string): "panel" | "sunum" | null {
  const value = typeOrKind.trim().toLocaleLowerCase("tr");
  if (value === "panel") return "panel";
  if (value === "sunum" || value === "seminer" || value === "quick talk" || value === "konuşma" || value === "konusma") {
    return "sunum";
  }
  return null;
}

export function canonicalVenue(location: string): string {
  const clean = location.trim();
  if (VENUES.some((venue) => venue.label === clean)) return clean;
  if (/tt seminer/i.test(clean)) return TT_SEMINER;
  if (/sb seminer/i.test(clean)) return SB_SEMINER;
  if (/pavilyon|pavilion|ana sahne/i.test(clean)) return SB_PAVILYON;
  return "";
}

export function clockMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function isMonday(iso: string) {
  return new Date(`${iso}T00:00:00`).getDay() === 1;
}

export function inCopWindow(iso: string) {
  return iso >= COP_FIRST && iso <= COP_LAST;
}

export function timeLocked(location: string, date: string) {
  return canonicalVenue(location) === TT_SEMINER && TT_OPEN_CLOCK.has(date);
}

export function datesForVenue(location: string, dates: string[]) {
  const venue = canonicalVenue(location);
  return dates.filter((date) => {
    if (!inCopWindow(date)) return false;
    if (venue === SB_SEMINER) return isMonday(date);
    return venue === TT_SEMINER || venue === SB_PAVILYON;
  });
}

export function venueHint(location: string) {
  return VENUES.find((venue) => venue.label === canonicalVenue(location))?.hint || "";
}

export function clockLabel(startTime: string, endTime: string) {
  if (!startTime || !endTime) return "Saat belli değil";
  return `${startTime}–${endTime}`;
}

export function timesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  const startA = clockMinutes(aStart);
  const endA = clockMinutes(aEnd);
  const startB = clockMinutes(bStart);
  const endB = clockMinutes(bEnd);
  if (startA == null || endA == null || startB == null || endB == null) return false;
  return startA < endB && startB < endA;
}

export function venueRuleError(input: { location: string; date: string; startTime: string; endTime: string }) {
  const location = canonicalVenue(input.location);
  if (!location) return "Yer olarak TT Seminer Salonu, SB Seminer Salonu veya SB Pavilyon seçin.";
  if (!inCopWindow(input.date)) return "Tarih 9–20 Kasım arasında olmalı.";
  if (location === SB_SEMINER && !isMonday(input.date)) {
    return "SB Seminer Salonu yalnızca pazartesi seçilir.";
  }
  if (timeLocked(location, input.date)) {
    if (input.startTime || input.endTime) return "TT Seminer Salonu 9 ve 10 Kasım için saat henüz belli değil.";
    return "";
  }
  const start = clockMinutes(input.startTime);
  const end = clockMinutes(input.endTime);
  if (start == null || end == null) return "Saat seçin.";
  if (end <= start) return "Bitiş saati başlangıçtan sonra olmalı.";
  if (location === SB_SEMINER && (start < SB_SEMINER_START || end > SB_SEMINER_END)) {
    return "SB Seminer Salonu yalnızca 12:00–22:00 arasında seçilir.";
  }
  return "";
}

export function adjustBooking(input: {
  location: string;
  date: string;
  startTime: string;
  endTime: string;
  dates: string[];
}) {
  const location = canonicalVenue(input.location) || SB_PAVILYON;
  const allowed = datesForVenue(location, input.dates);
  const date = allowed.includes(input.date) ? input.date : allowed[0] || input.date;
  if (timeLocked(location, date)) return { location, date, startTime: "", endTime: "" };
  let start = clockMinutes(input.startTime);
  let end = clockMinutes(input.endTime);
  if (start == null) start = location === SB_SEMINER ? SB_SEMINER_START : 10 * 60;
  if (end == null || end <= start) end = Math.min(start + 90, location === SB_SEMINER ? SB_SEMINER_END : 23 * 60);
  if (location === SB_SEMINER) {
    if (start < SB_SEMINER_START) start = SB_SEMINER_START;
    if (end > SB_SEMINER_END) end = SB_SEMINER_END;
    if (end <= start) end = Math.min(start + 90, SB_SEMINER_END);
  }
  return { location, date, startTime: fromMinutes(start), endTime: fromMinutes(end) };
}

function fromMinutes(value: number) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
