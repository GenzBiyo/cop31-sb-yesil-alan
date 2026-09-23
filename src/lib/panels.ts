import { prisma } from "./prisma";
import { broadcast } from "./realtime";

export type NamedGuest = { name: string; organization?: string };

async function upsertPerson(name: string, organization = "", kind = "speaker") {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const org = organization.trim();
  const found = await prisma.person.findFirst({
    where: { name: trimmed, ...(org ? { organization: org } : {}) },
  });
  if (found) return found;
  return prisma.person.create({
    data: { name: trimmed, organization: org, kind },
  });
}

export async function setPanelGuests(
  panelId: string,
  moderator: NamedGuest | null,
  speakers: NamedGuest[],
) {
  await prisma.panelPerson.deleteMany({ where: { panelId } });
  if (moderator?.name.trim()) {
    const person = await upsertPerson(moderator.name, moderator.organization, "moderator");
    if (person) {
      await prisma.panelPerson.create({
        data: { panelId, personId: person.id, role: "moderator", confirmed: "Davet edildi" },
      });
    }
  }
  for (const speaker of speakers) {
    if (!speaker.name.trim()) continue;
    const person = await upsertPerson(speaker.name, speaker.organization, "speaker");
    if (person) {
      await prisma.panelPerson.create({
        data: { panelId, personId: person.id, role: "panelist", confirmed: "Davet edildi" },
      });
    }
  }
}

export async function syncPanelAgenda(panel: {
  id: string;
  title: string;
  kind: string;
  date: string;
  startTime: string;
  endTime: string;
  topic: string;
  location: string;
}) {
  const day = await prisma.thematicDay.findUnique({ where: { date: panel.date } });
  if (!day) return;
  const type = panel.kind === "sunum" ? "Sunum" : "Panel";
  const data = {
    dayId: day.id,
    startTime: panel.startTime,
    endTime: panel.endTime,
    title: panel.title,
    description: panel.topic,
    location: panel.location,
    type,
    panelId: panel.id,
    status: "Planlandı",
  };
  const existing = await prisma.agendaItem.findFirst({ where: { panelId: panel.id } });
  if (existing) await prisma.agendaItem.update({ where: { id: existing.id }, data });
  else await prisma.agendaItem.create({ data });
  broadcast({ type: "agenda" });
}
