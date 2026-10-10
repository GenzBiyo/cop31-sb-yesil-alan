import { prisma } from "./prisma";
import {
  TT_SEMINER,
  canonicalVenue,
  sessionKind,
  timesOverlap,
  venueRuleError,
} from "./venues";

const SESSION_TYPES = ["Panel", "Sunum", "Seminer", "Quick Talk", "Konuşma"];

export async function venueBookingError(input: {
  location: string;
  date: string;
  startTime: string;
  endTime: string;
  kind: string;
  panelId?: string;
  agendaId?: string;
}) {
  const rule = venueRuleError(input);
  if (rule) return rule;
  const location = canonicalVenue(input.location);
  const kind = sessionKind(input.kind);
  if (!kind || !location) return "Yer olarak TT Seminer Salonu, SB Seminer Salonu veya SB Pavilyon seçin.";

  if (location === TT_SEMINER && kind === "panel") {
    const panels = await prisma.panel.findMany({
      where: {
        status: { not: "Reddedildi" },
        ...(input.panelId ? { id: { not: input.panelId } } : {}),
      },
      select: { kind: true, location: true },
    });
    const orphans = await prisma.agendaItem.findMany({
      where: {
        type: "Panel",
        OR: [{ panelId: null }, { panelId: "" }],
        ...(input.agendaId ? { id: { not: input.agendaId } } : {}),
      },
      select: { location: true },
    });
    const used = [...panels.filter((row) => sessionKind(row.kind) === "panel"), ...orphans].filter(
      (row) => canonicalVenue(row.location) === TT_SEMINER,
    ).length;
    if (used >= 3) return "TT Seminer Salonu en fazla 3 panel alır.";
  }

  const panels = await prisma.panel.findMany({
    where: {
      date: input.date,
      status: { not: "Reddedildi" },
      ...(input.panelId ? { id: { not: input.panelId } } : {}),
    },
    select: { id: true, title: true, location: true, startTime: true, endTime: true },
  });
  const agenda = await prisma.agendaItem.findMany({
    where: {
      day: { date: input.date },
      type: { in: SESSION_TYPES },
      OR: [{ panelId: null }, { panelId: "" }],
      ...(input.agendaId ? { id: { not: input.agendaId } } : {}),
    },
    select: { title: true, location: true, startTime: true, endTime: true },
  });
  const clash = [...panels, ...agenda].find(
    (row) =>
      canonicalVenue(row.location) === location &&
      timesOverlap(input.startTime, input.endTime, row.startTime, row.endTime),
  );
  if (!clash) return "";
  const when = clash.startTime && clash.endTime ? ` (${clash.startTime}–${clash.endTime})` : "";
  return `Bu yerde bu saat dolu: ${clash.title}${when}`;
}
