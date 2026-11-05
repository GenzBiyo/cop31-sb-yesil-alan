import { prisma } from "./prisma";
import { foldName } from "./speaker-names";
import { formatSessionWhen, type SpeakerLineupPerson, type SpeakerSession, type SpeakerShare } from "./speaker-share";
import { SPEAKER_APPROVED } from "./speakers";

function lineupRank(role: string) {
  if (role === "moderator") return 0;
  if (role === "acilis") return 1;
  if (role === "sunum") return 2;
  if (role === "panelist") return 3;
  if (role === "kapanis") return 4;
  return 5;
}

function sessionCopy(kind: string, role: string) {
  if (role === "moderator") return { headline: "Moderatörüm", lead: "şu panelde" };
  if (kind === "sunum" || role === "sunum") return { headline: "Konuşuyorum", lead: "şu sunumda" };
  if (role === "acilis") return { headline: "Konuşuyorum", lead: "açılışta" };
  if (role === "kapanis") return { headline: "Konuşuyorum", lead: "kapanışta" };
  return { headline: "Konuşuyorum", lead: "şu panelde" };
}

export async function loadSpeakerShare(id: string): Promise<SpeakerShare | null> {
  if (!/^[a-z0-9]{8,40}$/i.test(id)) return null;
  const speaker = await prisma.speaker.findUnique({
    where: { id },
    select: { id: true, name: true, title: true, organization: true, photoPath: true, status: true },
  });
  if (!speaker || speaker.status !== SPEAKER_APPROVED || !speaker.name.trim()) return null;

  const [rows, catalog] = await Promise.all([
    prisma.panelPerson.findMany({
      where: { panel: { status: { not: "Reddedildi" } } },
      select: {
        role: true,
        talkTitle: true,
        sortOrder: true,
        person: { select: { name: true, role: true, organization: true } },
        panel: {
          select: {
            id: true,
            title: true,
            kind: true,
            date: true,
            startTime: true,
            endTime: true,
            location: true,
          },
        },
      },
    }),
    prisma.speaker.findMany({
      where: { active: true, status: { not: "Reddedildi" } },
      select: { name: true, title: true, organization: true, photoPath: true },
    }),
  ]);

  const known = new Map<string, { title: string; organization: string; photoPath: string }>();
  for (const row of [...catalog].sort((a, b) => Number(Boolean(a.photoPath)) - Number(Boolean(b.photoPath)))) {
    known.set(foldName(row.name), { title: row.title, organization: row.organization, photoPath: row.photoPath });
  }

  const byPanel = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = byPanel.get(row.panel.id) || [];
    list.push(row);
    byPanel.set(row.panel.id, list);
  }

  const key = foldName(speaker.name);
  const sessions: SpeakerSession[] = [];
  for (const group of byPanel.values()) {
    const mine = group.find((row) => foldName(row.person.name) === key);
    if (!mine) continue;
    const copy = sessionCopy(mine.panel.kind, mine.role);
    const lineup: SpeakerLineupPerson[] = [...group]
      .sort((a, b) => lineupRank(a.role) - lineupRank(b.role) || a.sortOrder - b.sortOrder)
      .map((row) => {
        const match = known.get(foldName(row.person.name));
        return {
          name: row.person.name,
          role: row.role,
          title: row.person.role || match?.title || "",
          organization: row.person.organization || match?.organization || "",
          photoPath: match?.photoPath || "",
        };
      });
    sessions.push({
      id: mine.panel.id,
      title: mine.panel.title,
      kind: mine.panel.kind,
      role: mine.role,
      date: mine.panel.date,
      startTime: mine.panel.startTime,
      endTime: mine.panel.endTime,
      location: mine.panel.location,
      talkTitle: mine.talkTitle,
      when: formatSessionWhen(mine.panel.date, mine.panel.startTime, mine.panel.endTime),
      lead: copy.lead,
      headline: copy.headline,
      lineup,
    });
  }
  sessions.sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`, "tr"));

  return {
    id: speaker.id,
    name: speaker.name,
    title: speaker.title,
    organization: speaker.organization,
    photoPath: speaker.photoPath,
    sessions,
  };
}
