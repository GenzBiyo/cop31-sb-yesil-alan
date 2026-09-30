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
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
