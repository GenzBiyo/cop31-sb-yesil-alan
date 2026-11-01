import { prisma } from "./prisma";
import { foldName } from "./speaker-names";
import { formatSessionWhen, type SpeakerSession, type SpeakerShare } from "./speaker-share";
import { SPEAKER_APPROVED } from "./speakers";

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

  const rows = await prisma.panelPerson.findMany({
    where: { panel: { status: { not: "Reddedildi" } } },
    select: {
      role: true,
      talkTitle: true,
      person: { select: { name: true } },
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
  });

  const key = foldName(speaker.name);
  const seen = new Set<string>();
  const sessions: SpeakerSession[] = [];
  for (const row of rows) {
    if (foldName(row.person.name) !== key || seen.has(row.panel.id)) continue;
    seen.add(row.panel.id);
    const copy = sessionCopy(row.panel.kind, row.role);
    sessions.push({
      id: row.panel.id,
      title: row.panel.title,
      kind: row.panel.kind,
      role: row.role,
      date: row.panel.date,
      startTime: row.panel.startTime,
      endTime: row.panel.endTime,
      location: row.panel.location,
      talkTitle: row.talkTitle,
      when: formatSessionWhen(row.panel.date, row.panel.startTime, row.panel.endTime),
      lead: copy.lead,
      headline: copy.headline,
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
