import { prisma } from "./prisma";
import { EVENT_CATALOG } from "./event-catalog";

const solaklarFlag = globalThis as unknown as { solaklarCancelled?: boolean };

export async function cancelSolaklar() {
  if (solaklarFlag.solaklarCancelled) return;
  await prisma.pavilionEvent.deleteMany({
    where: {
      OR: [
        { slug: { startsWith: "solaklar-" } },
        { location: { contains: "Solaklar" } },
        { title: { contains: "Solaklar" } },
      ],
    },
  });
  await prisma.agendaItem.deleteMany({
    where: {
      OR: [{ location: { contains: "Solaklar" } }, { title: { contains: "Solaklar" } }],
    },
  });
  const days = await prisma.thematicDay.findMany({ where: { notes: { contains: "Solaklar" } } });
  for (const day of days) {
    const notes = day.notes
      .split("\n")
      .filter((line) => !line.includes("Solaklar"))
      .join("\n")
      .trim();
    await prisma.thematicDay.update({ where: { id: day.id }, data: { notes } });
  }
  await prisma.ambassadorActivity.deleteMany({
    where: {
      OR: [
        { title: { contains: "Solaklar" } },
        { title: { contains: "Solak köy" } },
        { location: { contains: "Solaklar" } },
      ],
    },
  });
  await prisma.pavilionTag.updateMany({
    where: { OR: [{ code: "SOLAKLAR" }, { title: { contains: "Solaklar" } }] },
    data: {
      active: false,
      title: "Solaklar outdoor iptal",
      message: "Solaklar outdoor programı iptal edilmiştir.",
      location: "",
    },
  });
  solaklarFlag.solaklarCancelled = true;
}

const eventsFlag = globalThis as unknown as { eventsReady?: boolean };

export async function ensureEvents() {
  await cancelSolaklar();
  if (eventsFlag.eventsReady) return;
  const catalogCount = await prisma.pavilionEvent.count();
  if (catalogCount >= EVENT_CATALOG.length) {
    eventsFlag.eventsReady = true;
    return;
  }
  for (const e of EVENT_CATALOG) {
    const existing = await prisma.pavilionEvent.findUnique({ where: { slug: e.slug } });
    if (existing) continue;
    await prisma.pavilionEvent.create({
      data: {
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
        config: JSON.stringify(e.config),
        published: true,
      },
    });
  }
  eventsFlag.eventsReady = true;
}
