import { prisma } from "@/lib/prisma";
import { googleTemplateUrl, icsResponse, toIcsEvent, wrapIcs, type CalendarEvent } from "@/lib/calendar";

async function programEvents(): Promise<CalendarEvent[]> {
  const days = await prisma.thematicDay.findMany({
    include: { agenda: { orderBy: [{ startTime: "asc" }, { sortOrder: "asc" }] } },
    orderBy: { date: "asc" },
  });
  const events: CalendarEvent[] = [];
  for (const day of days) {
    if (!day.agenda.length) {
      events.push({
        id: `day-${day.id}`,
        title: `COP31 · ${day.themeTr}`,
        description: [day.topic1, day.topic2].filter(Boolean).join("\n"),
        location: "Antalya EXPO Center — Sağlık Pavilionu, Blue Zone",
        date: day.date,
        startTime: "09:00",
        endTime: "18:00",
      });
      continue;
    }
    for (const item of day.agenda) {
      events.push({
        id: item.id,
        title: item.title,
        description: `${day.themeTr}\n${item.description || item.type}`,
        location: item.location,
        date: day.date,
        startTime: item.startTime,
        endTime: item.endTime,
      });
    }
  }
  return events;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const format = searchParams.get("format") || "ics";
  const events = await programEvents();
  const selected = id ? events.filter((e) => e.id === id) : events;
  if (!selected.length) return new Response("Etkinlik yok", { status: 404 });

  if (format === "google") {
    if (selected.length === 1) {
      return Response.redirect(googleTemplateUrl(selected[0]), 302);
    }
    return Response.json({
      events: selected.map((e) => ({ ...e, googleUrl: googleTemplateUrl(e) })),
    });
  }

  const ics = wrapIcs(selected.map(toIcsEvent));
  const name = selected.length === 1 ? "COP31-oturum.ics" : "COP31-Saglik-Pavilionu-program.ics";
  return icsResponse(ics, name);
}
