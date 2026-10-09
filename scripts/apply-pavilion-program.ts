import { PrismaClient } from "@prisma/client";
import { OFFICIAL_PANELS } from "../src/lib/official-panels";
import { PAVILION_CLOSED, PAVILION_SESSIONS, PAVILION_STANDS, PAVILION_THEMES } from "../src/lib/pavilion-program";

const prisma = new PrismaClient();

function panelStatus(status: string) {
  if (status === "Kesin") return "Teyit edildi";
  return "Planlama";
}

function conceptOf(session: (typeof PAVILION_SESSIONS)[number]) {
  const speakers = [
    session.moderator ? `Moderatör: ${session.moderator}` : "",
    ...session.speakers.map((name) => `Konuşmacı: ${name}`),
  ].filter(Boolean);
  return {
    flow: "",
    titleEn: session.titleEn,
    organiser: session.host,
    partners: [session.host, session.moderator, ...session.speakers].filter(Boolean).join("\n"),
    organiserContact: "",
    themePrimary: session.theme,
    themeSecondary: "",
    purpose: session.topics,
    keyQuestion: "",
    format: session.kind || "Panel",
    speakers: speakers.join("\n"),
    audience: "",
    outcomes: "",
    followUp: "",
    contribution: "",
    references: session.note,
  };
}

async function personId(name: string, kind: string) {
  const found = await prisma.person.findFirst({ where: { name } });
  if (found) return found.id;
  const created = await prisma.person.create({ data: { name, organization: name, kind } });
  return created.id;
}

async function main() {
  for (const [date, theme] of Object.entries(PAVILION_THEMES)) {
    await prisma.thematicDay.upsert({
      where: { date },
      create: { date, themeTr: theme.tr, themeEn: theme.en },
      update: { themeTr: theme.tr, themeEn: theme.en },
    });
  }

  const retired = [...OFFICIAL_PANELS.map((panel) => panel.title), "İklim, Eşitsizlik ve Kapsayıcı Geçiş"];
  const official = await prisma.panel.findMany({
    where: {
      kind: "panel",
      companyId: "",
      OR: [{ notes: { startsWith: "pav:" } }, { title: { in: retired } }],
    },
    select: { id: true },
  });
  const officialIds = official.map((panel) => panel.id);
  await prisma.agendaItem.deleteMany({
    where: {
      OR: [
        { slotKey: { startsWith: "pav:" } },
        { type: "Stant" },
        { title: { in: retired } },
        ...(officialIds.length ? [{ panelId: { in: officialIds } }] : []),
      ],
    },
  });
  if (officialIds.length) {
    await prisma.panel.deleteMany({ where: { id: { in: officialIds } } });
  }

  const days = await prisma.thematicDay.findMany();
  const dayId = new Map(days.map((day) => [day.date, day.id]));

  for (const [index, session] of PAVILION_SESSIONS.entries()) {
    const panel = await prisma.panel.create({
      data: {
        title: session.title,
        kind: "panel",
        date: session.date,
        startTime: session.start,
        endTime: session.end,
        theme: session.theme,
        topic: session.topics,
        summary: [session.topics, session.host && `Düzenleyen: ${session.host}`, session.note].filter(Boolean).join("\n"),
        concept: JSON.stringify(conceptOf(session)),
        partners: [session.host, session.moderator, ...session.speakers].filter(Boolean).join(", "),
        location: "Sağlık Pavilionu — Ana Sahne",
        status: panelStatus(session.status),
        notes: `pav:${session.code}`,
      },
    });
    if (session.moderator) {
      await prisma.panelPerson.create({
        data: { panelId: panel.id, personId: await personId(session.moderator, "moderator"), role: "moderator", confirmed: session.status === "Kesin" ? "Teyit edildi" : "Davet edildi" },
      });
    }
    for (const name of session.speakers) {
      await prisma.panelPerson.create({
        data: { panelId: panel.id, personId: await personId(name, "speaker"), role: "panelist", confirmed: session.status === "Kesin" ? "Teyit edildi" : "Davet edildi" },
      });
    }
    const owner = dayId.get(session.date);
    if (!owner) continue;
    await prisma.agendaItem.create({
      data: {
        dayId: owner,
        startTime: session.start,
        endTime: session.end,
        title: session.title,
        description: [session.topics, session.host && `Düzenleyen: ${session.host}`, session.moderator && `Moderatör: ${session.moderator}`, session.speakers.length ? `Konuşmacılar: ${session.speakers.join(", ")}` : "", session.status && session.status !== "Kesin" ? session.status : ""].filter(Boolean).join("\n"),
        type: "Panel",
        panelId: panel.id,
        location: "Sağlık Pavilionu — Ana Sahne",
        status: "Planlandı",
        sortOrder: index,
        slotKey: `pav:${session.code}`,
      },
    });
  }

  for (const date of PAVILION_CLOSED) {
    const owner = dayId.get(date);
    if (!owner) continue;
    await prisma.agendaItem.create({
      data: {
        dayId: owner,
        startTime: "10:00",
        endTime: "18:00",
        title: "Yeşil Alan kapalı",
        description: "Bu gün Yeşil Alan oturuma kapalı.",
        type: "Duyuru",
        location: "Yeşil Alan",
        status: "Planlandı",
        sortOrder: 0,
        slotKey: "pav:closed",
      },
    });
  }

  for (const [index, stand] of PAVILION_STANDS.entries()) {
    const owner = dayId.get(stand.date);
    if (!owner) continue;
    await prisma.agendaItem.create({
      data: {
        dayId: owner,
        startTime: stand.start,
        endTime: stand.end,
        title: stand.name,
        description: stand.stand,
        type: "Stant",
        location: stand.stand,
        status: "Planlandı",
        sortOrder: 100 + index,
        slotKey: `pav:stand:${stand.date}:${stand.stand}:${stand.start}`,
      },
    });
  }

  console.log(`PROGRAM_APPLIED sessions=${PAVILION_SESSIONS.length} stands=${PAVILION_STANDS.length}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
