import { PrismaClient } from "@prisma/client";
import { OFFICIAL_PANELS } from "../src/lib/official-panels";

const prisma = new PrismaClient();

function conceptOf(panel: (typeof OFFICIAL_PANELS)[number]) {
  return {
    titleEn: panel.titleEn,
    organiser: "",
    partners: [panel.moderator, ...panel.panelists].join("\n"),
    organiserContact: "",
    themePrimary: panel.theme,
    themeSecondary: "",
    purpose: panel.topics,
    keyQuestion: "",
    format: "Panel",
    speakers: [`Moderatör: ${panel.moderator}`, ...panel.panelists.map((name) => `Panelist: ${name}`)].join("\n"),
    audience: "",
    outcomes: "",
    followUp: "",
    contribution: "",
    references: "COP31 Planning (TR-MoH & UNEP)",
  };
}

async function personId(name: string, kind: string) {
  const found = await prisma.person.findFirst({ where: { name } });
  if (found) return found.id;
  const created = await prisma.person.create({ data: { name, organization: name, kind } });
  return created.id;
}

async function main() {
  for (const spec of OFFICIAL_PANELS) {
    const day = await prisma.thematicDay.findUnique({ where: { date: spec.date } });
    const existing = await prisma.panel.findFirst({
      where: {
        title: spec.title,
        NOT: { OR: [{ kind: "sunum" }, { title: { contains: "Görünmeyen Kazanımlar" } }] },
      },
    });
    const data = {
      title: spec.title,
      kind: "panel",
      date: spec.date,
      startTime: spec.start,
      endTime: spec.end,
      theme: day?.themeTr || spec.theme,
      topic: spec.topics,
      summary: spec.topics,
      concept: JSON.stringify(conceptOf(spec)),
      partners: [spec.moderator, ...spec.panelists].join(", "),
      location: "Sağlık Pavilionu — Ana Sahne",
      status: existing?.status && existing.status !== "Reddedildi" ? existing.status : "Planlama",
    };
    const panel = existing
      ? await prisma.panel.update({ where: { id: existing.id }, data })
      : await prisma.panel.create({ data });

    await prisma.panelPerson.deleteMany({ where: { panelId: panel.id } });
    const moderatorId = await personId(spec.moderator, "moderator");
    await prisma.panelPerson.create({
      data: { panelId: panel.id, personId: moderatorId, role: "moderator", confirmed: "Davet edildi" },
    });
    for (const name of spec.panelists) {
      const id = await personId(name, "speaker");
      await prisma.panelPerson.create({
        data: { panelId: panel.id, personId: id, role: "panelist", confirmed: "Davet edildi" },
      });
    }

    await prisma.agendaItem.deleteMany({ where: { panelId: panel.id } });
    console.log(spec.date, existing ? "updated" : "created", spec.title);
  }

  const slots = [
    { slotKey: "etkinlik-1", type: "Etkinlik", startTime: "09:00", endTime: "10:00", title: "Günün etkinliği", sortOrder: 10, need: 1 },
    { slotKey: "sunum-1", type: "Sunum", startTime: "10:15", endTime: "11:00", title: "Sunum 1", sortOrder: 20, need: 2 },
    { slotKey: "sunum-2", type: "Sunum", startTime: "11:15", endTime: "12:00", title: "Sunum 2", sortOrder: 30, need: 2 },
    { slotKey: "panel-1", type: "Panel", startTime: "14:00", endTime: "15:15", title: "Panel 1", sortOrder: 40, need: 2 },
    { slotKey: "panel-2", type: "Panel", startTime: "15:30", endTime: "16:45", title: "Panel 2", sortOrder: 50, need: 2 },
  ];
  const days = await prisma.thematicDay.findMany({ include: { agenda: { select: { slotKey: true, type: true } } } });
  for (const day of days) {
    const haveKey = new Set(day.agenda.map((item) => item.slotKey).filter(Boolean));
    const counts: Record<string, number> = { Etkinlik: 0, Sunum: 0, Panel: 0 };
    for (const item of day.agenda) if (counts[item.type] != null) counts[item.type] += 1;
    for (const slot of slots) {
      if (haveKey.has(slot.slotKey)) continue;
      if ((counts[slot.type] || 0) >= slot.need) continue;
      await prisma.agendaItem.create({
        data: {
          dayId: day.id,
          slotKey: slot.slotKey,
          type: slot.type,
          startTime: slot.startTime,
          endTime: slot.endTime,
          title: slot.title,
          description: `${day.themeTr} · ${slot.type} boşluğu. Başlık ve saati düzenleyin.`,
          location: "Sağlık Pavilionu — Ana Sahne",
          status: "Planlandı",
          sortOrder: slot.sortOrder,
        },
      });
      counts[slot.type] = (counts[slot.type] || 0) + 1;
      haveKey.add(slot.slotKey);
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
