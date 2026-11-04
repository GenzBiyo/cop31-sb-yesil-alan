import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";
import { setPanelLineup, syncPanelAgenda, type LineupGuest } from "../src/lib/panels";
import { parseConcept } from "../src/lib/session-concept";
import { foldName } from "../src/lib/speaker-names";
import { SPEAKER_APPROVED } from "../src/lib/speakers";

const prisma = new PrismaClient();
const STAGE = "Sağlık Pavilionu — Ana Sahne";
const PREFIXES = [
  "Dr. Öğr. Üyesi",
  "Prof. Dr.",
  "Prof.Dr.",
  "Prof Dr.",
  "Doç. Dr.",
  "Doç.Dr.",
  "Doç Dr.",
  "Uzm. Dr.",
  "Uzm.Dr.",
  "Uzm. Ecz.",
  "Dr. Dt.",
  "Op. Dr.",
  "Dt.",
  "Dr.",
  "Uzm.",
];

type Session = {
  date: string;
  start: string;
  end: string;
  label: string;
  title: string;
  opening: string[];
  moderator: string[];
  panelists: string[];
  speakers: string[];
  orgs: string[];
  place: string;
  summary: string;
  climate: string;
};

function tokens(value: string) {
  return new Set(foldName(value).split(" ").filter((word) => word.length > 2));
}

function jaccard(a: string, b: string) {
  const left = tokens(a);
  const right = tokens(b);
  if (!left.size || !right.size) return 0;
  let shared = 0;
  for (const token of left) if (right.has(token)) shared += 1;
  return shared / (left.size + right.size - shared);
}

function splitPerson(raw: string) {
  let text = raw.replace(/\s+/g, " ").trim();
  let organization = "";
  const paren = text.match(/^(.*?)\s*\((.+)\)\s*$/);
  if (paren && !/çevrimiçi|online/i.test(paren[2])) {
    text = paren[1].trim();
    organization = paren[2].trim();
  } else {
    const dash = text.match(/^(.*?)\s+[–—-]\s+(.+)$/);
    if (dash && dash[2].trim().length > 3) {
      text = dash[1].trim();
      organization = dash[2].trim();
    }
  }
  text = text.replace(/\.(\S)/g, ". $1");
  let title = "";
  const lower = text.toLocaleLowerCase("tr-TR");
  for (const prefix of PREFIXES) {
    const key = prefix.toLocaleLowerCase("tr-TR");
    if (lower.startsWith(key)) {
      title = prefix;
      text = text.slice(prefix.length).trim();
      break;
    }
  }
  return { name: text.replace(/\s+/g, " ").trim(), title, organization };
}

function guestsOf(session: Session): LineupGuest[] {
  const rows: { raw: string; role: LineupGuest["role"] }[] = [
    ...session.opening.map((raw) => ({ raw, role: "acilis" as const })),
    ...session.moderator.map((raw) => ({ raw, role: "moderator" as const })),
    ...session.panelists.map((raw) => ({ raw, role: "panelist" as const })),
    ...session.speakers.map((raw) => ({ raw, role: "panelist" as const })),
  ];
  const plain = rows.map((row) => ({ ...row, person: splitPerson(row.raw) }));
  const missingOrg = plain.filter((row) => !row.person.organization);
  const zip = missingOrg.length === session.orgs.length;
  let orgAt = 0;
  return plain
    .map((row) => {
      let organization = row.person.organization;
      if (!organization && zip) organization = session.orgs[orgAt++] || "";
      return { name: row.person.name, title: row.person.title, organization, role: row.role };
    })
    .filter((row) => row.name.length > 1);
}

function bookletText(session: Session) {
  return [session.summary, session.climate].filter(Boolean).join("\n\n");
}

async function saveSpeaker(guest: LineupGuest) {
  const name = guest.name.trim();
  if (!name) return;
  const key = foldName(name);
  const existing = await prisma.speaker.findMany({ select: { id: true, name: true, title: true, organization: true } });
  const found = existing.find((row) => foldName(row.name) === key);
  if (found) {
    await prisma.speaker.update({
      where: { id: found.id },
      data: {
        name,
        title: guest.title || found.title,
        organization: guest.organization || found.organization,
        status: SPEAKER_APPROVED,
        active: true,
      },
    });
    return;
  }
  const last = await prisma.speaker.aggregate({ _max: { sortOrder: true } });
  await prisma.speaker.create({
    data: {
      name,
      title: guest.title || "",
      organization: guest.organization || "",
      status: SPEAKER_APPROVED,
      active: true,
      sortOrder: (last._max.sortOrder || 0) + 1,
    },
  });
  console.log(`KONUSMACI ${name}`);
}

async function main() {
  const sessions = JSON.parse(readFileSync(new URL("../data/kitapcik-20261103.json", import.meta.url), "utf8")) as Session[];
  const panels = await prisma.panel.findMany({
    select: { id: true, title: true, date: true, startTime: true, endTime: true, location: true, status: true, concept: true, kind: true, topic: true, summary: true },
  });
  const used = new Set<string>();

  const brokenName = /^\./;
  const speakers = await prisma.speaker.findMany({ select: { id: true, name: true } });
  for (const row of speakers) {
    if (brokenName.test(row.name.trim())) await prisma.speaker.delete({ where: { id: row.id } });
  }

  for (const session of sessions) {
    const ranked = panels
      .filter((panel) => panel.date === session.date && !used.has(panel.id))
      .map((panel) => {
        let score = Math.round(jaccard(panel.title, session.title) * 100);
        if (session.start && panel.startTime === session.start) score += 25;
        return { panel, score };
      })
      .sort((a, b) => b.score - a.score);
    const best = ranked[0];
    const next = ranked[1];
    const uniqueSlot = ranked.filter((row) => row.panel.startTime === session.start).length === 1;
    const ambiguous = Boolean(best && next && best.score < 90 && best.score - next.score < 8);
    const matched = best && !ambiguous && (best.score >= 55 || (uniqueSlot && best.score >= 30));
    const guests = guestsOf(session);
    const summary = bookletText(session);
    const location = session.place || STAGE;
    let panelId = "";

    if (matched && best) {
      used.add(best.panel.id);
      panelId = best.panel.id;
      const concept = parseConcept(best.panel.concept);
      if (session.summary) concept.purpose = session.summary;
      if (session.climate) concept.contribution = session.climate;
      if (session.orgs.length) {
        concept.partners = session.orgs.join("\n");
        concept.organiser = concept.organiser || session.orgs[0];
      }
      concept.speakers = guests.map((guest) => [guest.name, guest.title, guest.organization].filter(Boolean).join(" — ")).join("\n");
      await prisma.panel.update({
        where: { id: panelId },
        data: {
          title: session.title,
          date: session.date,
          startTime: session.start || best.panel.startTime,
          endTime: session.end || best.panel.endTime,
          location,
          partners: session.orgs.join("\n"),
          summary,
          concept: JSON.stringify(concept),
          status: best.panel.status === "Reddedildi" || best.panel.status === "Onay bekliyor" ? "Planlandı" : best.panel.status,
        },
      });
      console.log(`GUNCELLENDI ${session.date} ${session.start} ${session.title}`);
    } else {
      const created = await prisma.panel.create({
        data: {
          title: session.title,
          kind: "panel",
          date: session.date,
          startTime: session.start || "10:00",
          endTime: session.end || "11:00",
          location,
          partners: session.orgs.join("\n"),
          summary,
          concept: JSON.stringify({
            ...parseConcept(""),
            purpose: session.summary,
            contribution: session.climate,
            partners: session.orgs.join("\n"),
            organiser: session.orgs[0] || "",
            speakers: guests.map((guest) => guest.name).join("\n"),
          }),
          status: "Planlandı",
        },
      });
      panelId = created.id;
      console.log(`ACILDI ${session.date} ${session.start} ${session.title}`);
    }

    await setPanelLineup(panelId, guests);
    const panel = await prisma.panel.findUnique({ where: { id: panelId } });
    if (panel) await syncPanelAgenda(panel);
    for (const guest of guests) await saveSpeaker(guest);
  }

  const leftover = await prisma.person.findMany({ select: { id: true, name: true } });
  for (const row of leftover) {
    if (brokenName.test(row.name.trim())) await prisma.person.delete({ where: { id: row.id } }).catch(() => undefined);
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
