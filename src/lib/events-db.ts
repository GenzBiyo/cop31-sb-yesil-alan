import { prisma } from "./prisma";
import { EVENT_CATALOG } from "./event-catalog";

const solaklarFlag = globalThis as unknown as { solaklarCancelled?: boolean };

export function cancelSolaklar() {
  if (solaklarFlag.solaklarCancelled) return;
  solaklarFlag.solaklarCancelled = true;
  void cancelSolaklarWork().catch(() => {
    solaklarFlag.solaklarCancelled = false;
  });
}

async function cancelSolaklarWork() {
  const done = await prisma.setting.findUnique({ where: { key: "solaklarCancelled" } });
  if (done) return;
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
  await prisma.setting.upsert({
    where: { key: "solaklarCancelled" },
    update: { value: "1" },
    create: { key: "solaklarCancelled", value: "1" },
  });
}

const DIGITAL_TYPES = ["quiz", "wheel", "match", "kilo", "hatira"];
const digitalFlag = globalThis as unknown as { digitalEventsReady?: boolean };

export async function hideNonDigitalEvents() {
  if (digitalFlag.digitalEventsReady) return;
  const done = await prisma.setting.findUnique({ where: { key: "eventsDigitalOnly" } });
  if (!done) {
    await prisma.pavilionEvent.updateMany({
      where: { NOT: { type: { in: DIGITAL_TYPES } } },
      data: { published: false },
    });
    await prisma.agendaItem.deleteMany({
      where: {
        OR: [{ type: "Stant" }, { type: "Stand" }, { title: { startsWith: "Stant " } }, { title: { startsWith: "Stand " } }],
      },
    });
    await prisma.pavilionTag.updateMany({ where: { code: "STAND" }, data: { active: false } });
    await prisma.setting.upsert({
      where: { key: "eventsDigitalOnly" },
      update: { value: "1" },
      create: { key: "eventsDigitalOnly", value: "1" },
    });
  }
  digitalFlag.digitalEventsReady = true;
}

const eventsFlag = globalThis as unknown as { eventsReady?: boolean };

export async function ensureEvents() {
  cancelSolaklar();
  if (!eventsFlag.eventsReady) {
    const catalogCount = await prisma.pavilionEvent.count();
    if (catalogCount < EVENT_CATALOG.length) {
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
            published: DIGITAL_TYPES.includes(e.type),
          },
        });
      }
    }
    eventsFlag.eventsReady = true;
  }
  await hideNonDigitalEvents();
}
