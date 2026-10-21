import { prisma } from "@/lib/prisma";

const FLAG = "oxoidNotAstorg";
const memory = globalThis as unknown as { oxoidReady?: boolean };

function asOxoid(value: string) {
  if (!/astorg|astrog/i.test(value)) return value;
  return value
    .replace(/astorg(?:\s*\([^)]*\))?/gi, "Oxoid")
    .replace(/astrog(?:\s*\([^)]*\))?/gi, "Oxoid")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function changed(row: Record<string, unknown>, fields: string[]) {
  const data: Record<string, string> = {};
  for (const field of fields) {
    const current = String(row[field] ?? "");
    const next = field === "website" && /astorg|astrog/i.test(current) ? "" : asOxoid(current);
    if (next !== current) data[field] = next;
  }
  return data;
}

async function sweep<T extends { id: string }>(
  rows: T[],
  fields: string[],
  save: (id: string, data: Record<string, string>) => Promise<unknown>,
) {
  for (const row of rows) {
    const data = changed(row as unknown as Record<string, unknown>, fields);
    if (Object.keys(data).length) await save(row.id, data);
  }
}

const hit = { contains: "storg" } as const;
const hitG = { contains: "strog" } as const;

export async function renameAstorgToOxoid() {
  if (memory.oxoidReady) return;
  const done = await prisma.setting.findUnique({ where: { key: FLAG } });
  if (done) {
    memory.oxoidReady = true;
    return;
  }

  const companies = await prisma.company.findMany({
    where: {
      OR: [
        { name: hit }, { name: hitG }, { nameEn: hit }, { nameEn: hitG },
        { slug: hit }, { slug: hitG }, { website: hit }, { website: hitG },
        { topic: hit }, { context: hit }, { contribution: hit }, { notes: hit },
        { delegation: hit },
      ],
    },
  });
  for (const company of companies) {
    const data = changed(company, ["name", "nameEn", "topic", "topicEn", "context", "contextEn", "contribution", "contributionEn", "notes", "website", "delegation", "contactName"]);
    if (/astorg|astrog/i.test(company.slug)) {
      const slug = "oxoid";
      const taken = await prisma.company.findFirst({ where: { slug, NOT: { id: company.id } }, select: { id: true } });
      data.slug = taken ? `oxoid-${company.id.slice(0, 6)}` : slug;
      await prisma.spaceZone.updateMany({ where: { companySlug: company.slug }, data: { companySlug: data.slug } });
      await prisma.person.updateMany({ where: { companySlug: company.slug }, data: { companySlug: data.slug } });
    }
    if (Object.keys(data).length) await prisma.company.update({ where: { id: company.id }, data });
  }

  await sweep(
    await prisma.speaker.findMany({
      where: { OR: [{ organization: hit }, { organization: hitG }, { summary: hit }, { bio: hit }, { title: hit }] },
    }),
    ["organization", "summary", "bio", "title"],
    (id, data) => prisma.speaker.update({ where: { id }, data }),
  );
  await sweep(
    await prisma.person.findMany({
      where: { OR: [{ name: hit }, { name: hitG }, { organization: hit }, { organization: hitG }, { note: hit }, { companySlug: hit }] },
    }),
    ["name", "organization", "note", "companySlug"],
    (id, data) => prisma.person.update({ where: { id }, data }),
  );
  await sweep(
    await prisma.panel.findMany({
      where: { OR: [{ title: hit }, { topic: hit }, { partners: hit }, { notes: hit }, { summary: hit }, { concept: hit }] },
    }),
    ["title", "topic", "partners", "notes", "summary", "concept"],
    (id, data) => prisma.panel.update({ where: { id }, data }),
  );
  await sweep(
    await prisma.agendaItem.findMany({
      where: { OR: [{ title: hit }, { description: hit }, { location: hit }] },
    }),
    ["title", "description", "location"],
    (id, data) => prisma.agendaItem.update({ where: { id }, data }),
  );
  await sweep(
    await prisma.pavilionEvent.findMany({
      where: { OR: [{ title: hit }, { companyName: hit }, { companyName: hitG }, { topic: hit }, { location: hit }, { description: hit }] },
    }),
    ["title", "companyName", "topic", "location", "description"],
    (id, data) => prisma.pavilionEvent.update({ where: { id }, data }),
  );
  await sweep(
    await prisma.spaceZone.findMany({
      where: { OR: [{ name: hit }, { name: hitG }, { description: hit }, { companySlug: hit }] },
    }),
    ["name", "description", "companySlug"],
    (id, data) => prisma.spaceZone.update({ where: { id }, data }),
  );
  await sweep(
    await prisma.stakeholderResponse.findMany({
      where: { OR: [{ companyName: hit }, { companyName: hitG }, { theme: hit }, { speakers: hit }] },
    }),
    ["companyName", "theme", "speakers", "meetingRequests", "ministryMeeting"],
    (id, data) => prisma.stakeholderResponse.update({ where: { id }, data }),
  );

  await prisma.setting.upsert({
    where: { key: FLAG },
    update: { value: "1" },
    create: { key: FLAG, value: "1" },
  });
  memory.oxoidReady = true;
}
