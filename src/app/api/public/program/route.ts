import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonOk } from "@/lib/api";
import { ensureEvents } from "@/lib/events-db";
import { memoGet, memoSet } from "@/lib/memo";
import { nudgeReminders } from "@/lib/agenda";

const FRESH = { "Cache-Control": "no-store" };
const SHOWN = /panel|sunum|seminer|quick talk|konuşma|etkinlik|deneyim|oyun/i;

const eventSelect = {
  slug: true,
  title: true,
  type: true,
  companyName: true,
  date: true,
  startTime: true,
  endTime: true,
  location: true,
  gift: true,
} as const;

function warmReminders() {
  nudgeReminders();
}

async function loadEvents() {
  return prisma.pavilionEvent.findMany({
    where: { published: true, type: { in: ["quiz", "wheel", "match", "kilo", "hatira"] } },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    select: eventSelect,
  });
}

export async function GET(req: NextRequest) {
  const eventsOnly = req.nextUrl.searchParams.get("part") === "events";
  const key = eventsOnly ? "public-program-events" : "public-program";
  const cached = memoGet<unknown>(key, 20000);
  if (cached) {
    warmReminders();
    return jsonOk(cached, 200, FRESH);
  }

  await ensureEvents();
  warmReminders();

  if (eventsOnly) {
    const body = { events: await loadEvents() };
    memoSet(key, body);
    return jsonOk(body, 200, FRESH);
  }

  const [days, events] = await Promise.all([
    prisma.thematicDay.findMany({
      orderBy: { date: "asc" },
      select: {
        date: true,
        themeTr: true,
        topic1: true,
        agenda: {
          orderBy: [{ startTime: "asc" }, { sortOrder: "asc" }],
          select: {
            id: true,
            startTime: true,
            endTime: true,
            title: true,
            location: true,
            type: true,
            description: true,
          },
        },
      },
    }),
    loadEvents(),
  ]);
  const body = {
    days: days.map((day) => ({
      ...day,
      agenda: day.agenda.filter((item) => SHOWN.test(item.type)),
    })),
    events,
  };
  memoSet(key, body);
  return jsonOk(body, 200, FRESH);
}
