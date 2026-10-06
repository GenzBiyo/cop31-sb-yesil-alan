import { prisma } from "./prisma";
import { broadcast } from "./realtime";
import { companyPanelWhere, isOwnParticipant } from "./company-panels";

export type NamedGuest = { name: string; organization?: string };
export type LineupGuest = { name: string; title?: string; organization?: string; role?: string };

export const GUEST_ROLES = ["acilis", "sunum", "panelist", "moderator", "kapanis"] as const;

export async function upsertPerson(name: string, organization = "", kind = "speaker", title = "") {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const org = organization.trim();
  const found = await prisma.person.findFirst({
    where: { name: trimmed, ...(org ? { organization: org } : {}) },
  });
  if (found) {
    if (title.trim() && title.trim() !== found.role) {
      return prisma.person.update({ where: { id: found.id }, data: { role: title.trim() } });
    }
    return found;
  }
  return prisma.person.create({
    data: { name: trimmed, organization: org, kind, role: title.trim() },
  });
}

/** Replaces the ordered lineup; people already on the panel keep their confirmation state. */
export async function setPanelLineup(panelId: string, guests: LineupGuest[]) {
  const existing = await prisma.panelPerson.findMany({ where: { panelId } });
  const kept = new Set<string>();
  let order = 0;
  for (const guest of guests) {
    if (!guest.name?.trim()) continue;
    const role = (GUEST_ROLES as readonly string[]).includes(String(guest.role)) ? String(guest.role) : "panelist";
    const person = await upsertPerson(
      guest.name,
      guest.organization || "",
      role === "moderator" ? "moderator" : "speaker",
      guest.title || ""
    );
    if (!person) continue;
    order += 1;
    const prev = existing.find((row) => row.personId === person.id && !kept.has(row.id));
    if (prev) {
      kept.add(prev.id);
      await prisma.panelPerson.update({ where: { id: prev.id }, data: { role, sortOrder: order } });
    } else {
      const row = await prisma.panelPerson.create({
        data: { panelId, personId: person.id, role, sortOrder: order, confirmed: "Davet edildi" },
      });
      kept.add(row.id);
    }
  }
  const stale = existing.filter((row) => !kept.has(row.id)).map((row) => row.id);
  if (stale.length) await prisma.panelPerson.deleteMany({ where: { id: { in: stale } } });
}

export type FirmTalk = { participantId?: string; name: string; title?: string; talkTitle?: string; talkNote?: string };

const clip = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/**
 * Saves a company's own speakers and talk notes on a panel or talk it takes part in.
 * Rows the company added itself can be removed; rows SB added for its people can only be edited.
 */
export async function saveFirmTalks(panelId: string, company: { id: string; slug: string; name: string }, talks: FirmTalk[]) {
  const panel = await prisma.panel.findFirst({
    where: { AND: [{ id: panelId }, companyPanelWhere(company)] },
    include: { participants: { include: { person: true } } },
  });
  if (!panel) throw new Error("Bu oturumda yer almıyorsunuz");
  if (panel.status === "Reddedildi") throw new Error("Reddedilen oturuma konuşma girilemez");
  const own = panel.participants.filter((row) => isOwnParticipant(row, company));
  const role = panel.kind === "sunum" ? "sunum" : "panelist";
  let order = Math.max(0, ...panel.participants.map((row) => row.sortOrder));
  const kept = new Set<string>();
  const added: { name: string; title: string }[] = [];

  for (const t of talks.slice(0, 10)) {
    const name = clip(t.name, 120);
    if (!name) continue;
    const title = clip(t.title, 160);
    const talk = { talkTitle: clip(t.talkTitle, 200), talkNote: clip(t.talkNote, 2000) };
    const prev = own.find((row) => row.id === t.participantId && !kept.has(row.id));
    if (prev && prev.person.name === name) {
      kept.add(prev.id);
      if (title !== prev.person.role) await prisma.person.update({ where: { id: prev.personId }, data: { role: title } });
      await prisma.panelPerson.update({ where: { id: prev.id }, data: talk });
      continue;
    }
    const person = await upsertPerson(name, company.name, "speaker", title);
    if (!person) continue;
    if (!person.companySlug) await prisma.person.update({ where: { id: person.id }, data: { companySlug: company.slug } });
    const onPanel = panel.participants.find((row) => row.personId === person.id && !kept.has(row.id));
    if (onPanel) {
      kept.add(onPanel.id);
      await prisma.panelPerson.update({ where: { id: onPanel.id }, data: talk });
      continue;
    }
    if (prev) {
      kept.add(prev.id);
      await prisma.panelPerson.update({ where: { id: prev.id }, data: { personId: person.id, companyId: company.id, ...talk } });
    } else {
      order += 1;
      const row = await prisma.panelPerson.create({
        data: { panelId, personId: person.id, role, sortOrder: order, confirmed: "Beklemede", companyId: company.id, ...talk },
      });
      kept.add(row.id);
    }
    added.push({ name, title });
  }

  const stale = own.filter((row) => row.companyId === company.id && !kept.has(row.id)).map((row) => row.id);
  if (stale.length) await prisma.panelPerson.deleteMany({ where: { id: { in: stale } } });
  broadcast({ type: "panel" });
  return { panel, added, removed: stale.length };
}

export async function setPanelGuests(
  panelId: string,
  moderator: NamedGuest | null,
  speakers: NamedGuest[],
) {
  await setPanelLineup(panelId, [
    ...speakers.map((s) => ({ ...s, role: "panelist" })),
    ...(moderator?.name.trim() ? [{ ...moderator, role: "moderator" }] : []),
  ]);
}

export async function syncPanelAgenda(panel: {
  id: string;
  title: string;
  kind: string;
  date: string;
  startTime: string;
  endTime: string;
  topic: string;
  summary?: string;
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
    description: (panel.summary || panel.topic || "").trim(),
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
