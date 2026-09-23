import { prisma } from "@/lib/prisma";
import { jsonOk } from "@/lib/api";
import { ensureEvents } from "@/lib/events-db";
import { memoGet, memoSet } from "@/lib/memo";

const FRESH = { "Cache-Control": "public, max-age=8, stale-while-revalidate=30" };

export async function GET() {
  const cached = memoGet<{ days: unknown; events: unknown }>("public-program", 8000);
  if (cached) return jsonOk(cached, 200, FRESH);

  const existing = await prisma.pavilionEvent.count();
  if (existing === 0) await ensureEvents();
  const [days, events] = await Promise.all([
    prisma.thematicDay.findMany({
      include: { agenda: { orderBy: [{ startTime: "asc" }, { sortOrder: "asc" }] } },
      orderBy: { date: "asc" },
    }),
    prisma.pavilionEvent.findMany({
      where: { published: true },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    }),
  ]);
  const body = {
    days,
    events: events.map((e) => ({
      id: e.id,
      slug: e.slug,
      title: e.title,
      type: e.type,
      companyName: e.companyName,
      topic: e.topic,
      date: e.date,
      startTime: e.startTime,
      endTime: e.endTime,
      location: e.location,
      description: e.description,
      gift: e.gift,
    })),
  };
  memoSet("public-program", body);
  return jsonOk(body, 200, FRESH);
}
