import { prisma } from "./prisma";
import { COP_DATES, copDayMeta } from "./cop-days";
import type { PlanDay, PlanItem, PlanKind } from "./plan-types";

export type { PlanDay, PlanItem, PlanKind } from "./plan-types";

const SUNUM_TYPES = /sunum|seminer|quick talk|konuşma/i;

function kindFromAgenda(type: string): PlanKind {
  if (/panel/i.test(type)) return "panel";
  if (SUNUM_TYPES.test(type)) return "sunum";
  if (/etkinlik|deneyim|oyun/i.test(type)) return "event";
  return "program";
}

function peopleLine(parts: { role: string; person: { name: string } }[]) {
  const mod = parts.filter((p) => p.role === "moderator").map((p) => p.person.name);
  const speak = parts.filter((p) => p.role !== "moderator").map((p) => p.person.name);
  const bits = [];
  if (mod.length) bits.push(`Moderatör: ${mod.join(", ")}`);
  if (speak.length) bits.push(speak.join(", "));
  return bits.join(" · ");
}

export async function loadDayPlan(): Promise<PlanDay[]> {
  const [days, panels, events] = await Promise.all([
    prisma.thematicDay.findMany({
      include: { agenda: { orderBy: [{ startTime: "asc" }, { sortOrder: "asc" }] } },
      orderBy: { date: "asc" },
    }),
    prisma.panel.findMany({
      include: { participants: { include: { person: { select: { name: true } } } } },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    }),
    prisma.pavilionEvent.findMany({
      where: { published: true },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    }),
  ]);

  const byDate = new Map<string, PlanItem[]>();
  for (const date of COP_DATES) byDate.set(date, []);

  for (const panel of panels) {
    if (panel.status === "Onay bekliyor" || panel.status === "Reddedildi") continue;
    const kind: PlanKind = panel.kind === "sunum" ? "sunum" : "panel";
    const list = byDate.get(panel.date) || [];
    list.push({
      id: `panel-${panel.id}`,
      kind,
      title: panel.title,
      startTime: panel.startTime,
      endTime: panel.endTime,
      location: panel.location,
      people: peopleLine(panel.participants),
      href: "/paneller",
    });
    byDate.set(panel.date, list);
  }

  for (const ev of events) {
    if (!ev.date) continue;
    const list = byDate.get(ev.date) || [];
    list.push({
      id: `event-${ev.id}`,
      kind: "event",
      title: ev.title,
      startTime: ev.startTime,
      endTime: ev.endTime,
      location: ev.location,
      people: ev.companyName,
      href: "/etkinlikler",
    });
    byDate.set(ev.date, list);
  }

  for (const day of days) {
    for (const item of day.agenda) {
      if (item.panelId) continue;
      const list = byDate.get(day.date) || [];
      list.push({
        id: `agenda-${item.id}`,
        kind: kindFromAgenda(item.type),
        title: item.title,
        startTime: item.startTime,
        endTime: item.endTime,
        location: item.location,
        people: item.type,
        href: "/program",
      });
      byDate.set(day.date, list);
    }
  }

  const themeByDate = new Map(days.map((d) => [d.date, d.themeTr]));

  return COP_DATES.map((date) => {
    const meta = copDayMeta(date);
    const rank: Record<PlanKind, number> = { panel: 0, sunum: 1, event: 2, program: 3 };
    const items = [...(byDate.get(date) || [])]
      .filter((i) => i.title.trim())
      .sort((a, b) => a.startTime.localeCompare(b.startTime) || rank[a.kind] - rank[b.kind]);
    const seen = new Set<string>();
    const unique = items.filter((item) => {
      const key = `${item.startTime}|${item.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return {
      date,
      themeTr: themeByDate.get(date) || meta.theme,
      weekday: meta.weekday,
      weekdayShort: meta.weekdayShort,
      day: meta.day,
      items: unique,
    };
  });
}
