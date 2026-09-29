import { PrismaClient } from "@prisma/client";
import { OFFICIAL_TALKS } from "../src/lib/official-talks";

const prisma = new PrismaClient();

async function personId(name: string) {
  const found = await prisma.person.findFirst({ where: { name } });
  if (found) return found.id;
  const created = await prisma.person.create({ data: { name, organization: name, kind: "speaker" } });
  return created.id;
}

async function main() {
  for (const spec of OFFICIAL_TALKS) {
    const day = await prisma.thematicDay.findUnique({ where: { date: spec.date } });
    const summary = `Süre: ${spec.minutes} dakika. Sunucu: ${spec.speakers.join(", ")}. Saat daha sonra girilecek.`;
    const existing = await prisma.panel.findFirst({ where: { kind: "sunum", title: spec.title } });
    const data = {
      title: spec.title,
      kind: "sunum",
      date: spec.date,
      startTime: "",
      endTime: "",
      theme: day?.themeTr || "",
      topic: summary,
      summary,
      concept: JSON.stringify({
        format: `Sunum · ${spec.minutes} dakika`,
        speakers: spec.speakers.map((name) => `Sunucu: ${name}`).join("\n"),
        partners: spec.speakers.join("\n"),
        purpose: spec.title,
        references: "COP31 Planning (TR-MoH & UNEP)",
      }),
      partners: spec.speakers.join(", "),
      notes: `${spec.minutes} dakika`,
      location: "Sağlık Pavilionu — Ana Sahne",
      status: existing?.status && existing.status !== "Reddedildi" ? existing.status : "Planlama",
    };
    const talk = existing
      ? await prisma.panel.update({ where: { id: existing.id }, data })
      : await prisma.panel.create({ data });
    await prisma.agendaItem.deleteMany({ where: { panelId: talk.id } });
    await prisma.panelPerson.deleteMany({ where: { panelId: talk.id } });
    for (const name of spec.speakers) {
      const id = await personId(name);
      await prisma.panelPerson.create({
        data: { panelId: talk.id, personId: id, role: "panelist", confirmed: "Davet edildi" },
      });
    }
    console.log(spec.date, existing ? "updated" : "created", spec.minutes, spec.title);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
