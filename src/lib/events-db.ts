import { prisma } from "./prisma";
import { renameAstorgToOxoid } from "./oxoid";

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

const clearedFlag = globalThis as unknown as { eventsTalksCleared?: boolean };

/** Drops saved events and talks once. Later additions stay. Panels stay. */
export async function clearEventsAndTalks() {
  if (clearedFlag.eventsTalksCleared) return;
  const done = await prisma.setting.findUnique({ where: { key: "eventsTalksCleared" } });
  if (done) {
    clearedFlag.eventsTalksCleared = true;
    return;
  }
  const talks = await prisma.panel.findMany({ where: { kind: "sunum" }, select: { id: true } });
  const talkIds = talks.map((row) => row.id);
  await prisma.eventSignup.deleteMany();
  await prisma.pavilionEvent.deleteMany();
  if (talkIds.length) {
    await prisma.agendaItem.deleteMany({ where: { panelId: { in: talkIds } } });
    await prisma.panelPerson.deleteMany({ where: { panelId: { in: talkIds } } });
    await prisma.panelMessage.deleteMany({ where: { panelId: { in: talkIds } } });
    await prisma.panel.deleteMany({ where: { id: { in: talkIds } } });
    await prisma.calendarJoin.deleteMany({ where: { itemKey: { in: talkIds.map((id) => `panel-${id}`) } } });
  }
  const agenda = await prisma.agendaItem.findMany({ select: { id: true, type: true } });
  const looseIds = agenda
    .filter((row) => /sunum|seminer|quick talk|konuşma|etkinlik|deneyim|oyun/i.test(row.type) && !/panel/i.test(row.type))
    .map((row) => row.id);
  if (looseIds.length) {
    await prisma.agendaItem.deleteMany({ where: { id: { in: looseIds } } });
    await prisma.calendarJoin.deleteMany({ where: { itemKey: { in: looseIds.map((id) => `agenda-${id}`) } } });
  }
  await prisma.calendarJoin.deleteMany({ where: { itemKey: { startsWith: "event-" } } });
  await prisma.setting.upsert({
    where: { key: "eventsTalksCleared" },
    update: { value: "1" },
    create: { key: "eventsTalksCleared", value: "1" },
  });
  clearedFlag.eventsTalksCleared = true;
}

export async function ensureEvents() {
  cancelSolaklar();
  await renameAstorgToOxoid();
  await clearEventsAndTalks();
  await hideNonDigitalEvents();
}
