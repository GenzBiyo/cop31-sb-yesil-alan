import { PrismaClient } from "@prisma/client";
import { setPanelLineup, syncPanelAgenda, type LineupGuest } from "../src/lib/panels";
import { GUEST_ROLE_LABELS, parseConcept } from "../src/lib/session-concept";
import { foldName } from "../src/lib/speaker-names";
import { SPEAKER_APPROVED } from "../src/lib/speakers";
import { PAVILION_THEMES } from "../src/lib/pavilion-program";

const prisma = new PrismaClient();

type Spec = {
  match: string[];
  dates: string[];
  start: string;
  end: string;
  title: string;
  location: string;
  series: string;
  partners: string[];
  guests: LineupGuest[];
  note?: string;
};

const SPECS: Spec[] = [
  {
    match: ["green industries", "sanayide yesil", "yesil sanayilesme"],
    dates: ["2026-11-09"],
    start: "12:30",
    end: "13:15",
    title: "Sanayide Yeşil Dönüşüm, İklim ve Halk Sağlığı",
    location: "Yeşil Sanayileşme Salonu (PRT 983)",
    series: "Sağlık Bakanlığı – Sürdürülebilir Eylem",
    partners: [
      "T.C. Sağlık Bakanlığı",
      "Ministry of Environment and Climate Change, Brazil",
      "Sanofi",
      "Türkiye Kalkınma Bankası",
    ],
    guests: [
      { name: "Umut Ağyüz", organization: "T.C. Sağlık Bakanlığı", role: "moderator" },
      {
        name: "Adalberto Maluf",
        organization:
          "National Secretary of Urban Environment, Water Resources and Environmental Quality, Ministry of Environment and Climate Change, Brazil; CCAC Co-Chair",
        role: "panelist",
      },
      { name: "Guilhem Granier", organization: "Sanofi Vaccines GM, Eurasia", role: "panelist" },
      { name: "Seçil Yıldız", organization: "Türkiye Kalkınma Bankası Genel Müdür Yardımcısı", role: "panelist" },
    ],
    note: "Adalberto Maluf: https://www.linkedin.com/in/adalberto-maluf/",
  },
  {
    match: ["iklimden nefese", "nefese"],
    dates: ["2026-11-09"],
    start: "15:00",
    end: "15:45",
    title: "İklimden Nefese: Dijital İzlemden Erken Uyarıya Daha Dirençli Geleceğe",
    location: "Dirençli Şehirler 2 Salonu (PRT 983)",
    series: "Sağlık Bakanlığı & UNEP",
    partners: ["T.C. Sağlık Bakanlığı", "UNEP", "Gaziantep Büyükşehir Belediyesi", "Sanofi"],
    guests: [
      { name: "Hakan Çelik", role: "moderator" },
      { name: "Fatma Şahin", organization: "Gaziantep Büyükşehir Belediye Başkanı", role: "acilis" },
      { name: "Cem Öztürk", organization: "Sanofi Avrasya Bölge Başkanı", role: "acilis" },
      { name: "Kıvılcım Kocabıyık", role: "acilis" },
      { name: "Kenan Volkan Demirel", organization: "Sağlığın Geliştirilmesi Genel Müdürü", role: "panelist" },
      { name: "Özgür Sezer", organization: "Sağlık Bilgi Sistemleri Genel Müdürü", role: "panelist" },
      { name: "Mikail Özdemir", title: "Doç. Dr.", organization: "Gaziantep İl Sağlık Müdürü", role: "panelist" },
      { name: "Hasan Bayram", title: "Prof. Dr.", organization: "Koç Üniversitesi Hastanesi, Göğüs Hastalıkları Uzmanı", role: "panelist" },
    ],
  },
  {
    match: ["is birligi bulusmalari", "isbirligi bulusmalari"],
    dates: ["2026-11-18", "2026-11-19"],
    start: "11:15",
    end: "12:00",
    title: "COP31 İş Birliği Buluşmaları",
    location: "Bilim ve Teknoloji Salonu (PRT 981)",
    series: "Sağlık Bakanlığı",
    partners: ["T.C. Sağlık Bakanlığı", "Gobi Partners", "Global Islamic Finance Impact Program (GIFIP)", "PepsiCo"],
    guests: [
      { name: "Erdem Dereli", organization: "Gobi Partners", role: "panelist" },
      { name: "Adnan Aziz", title: "Dr.", organization: "Global Islamic Finance Impact Program (GIFIP)", role: "panelist" },
      { name: "Esra Iren", organization: "PepsiCo", role: "panelist" },
    ],
  },
];

function hit(title: string, keys: string[]) {
  const folded = foldName(title);
  return keys.some((key) => folded.includes(key));
}

function guestLine(guest: LineupGuest) {
  const role = GUEST_ROLE_LABELS[guest.role || ""] || "Konuşmacı";
  const who = [guest.title, guest.name].filter(Boolean).join(" ");
  return [role, [who, guest.organization].filter(Boolean).join(" — ")].join(": ");
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
  const theme = PAVILION_THEMES["2026-11-19"];
  if (theme) {
    await prisma.thematicDay.upsert({
      where: { date: "2026-11-19" },
      create: { date: "2026-11-19", themeTr: theme.tr, themeEn: theme.en },
      update: {},
    });
  }

  const panels = await prisma.panel.findMany({
    select: { id: true, title: true, date: true, startTime: true, concept: true, summary: true, status: true },
  });

  for (const spec of SPECS) {
    const ranked = panels
      .filter((panel) => spec.dates.includes(panel.date) && panel.startTime === spec.start && hit(panel.title, spec.match))
      .concat(panels.filter((panel) => hit(panel.title, spec.match) && spec.dates.includes(panel.date)));
    const found = ranked[0];
    if (!found) {
      throw new Error(`BULUNAMADI ${spec.dates.join("/")} ${spec.start} ${spec.title}`);
    }
    const concept = parseConcept(found.concept);
    concept.speakers = [...spec.guests.map(guestLine), spec.note || ""].filter(Boolean).join("\n");
    if (!concept.organiser) concept.organiser = "T.C. Sağlık Bakanlığı";
    await prisma.panel.update({
      where: { id: found.id },
      data: {
        title: spec.title,
        date: spec.dates[spec.dates.length - 1],
        startTime: spec.start,
        endTime: spec.end,
        location: spec.location,
        theme: spec.series,
        topic: spec.series,
        partners: spec.partners.join("\n"),
        concept: JSON.stringify(concept),
        status: found.status === "Reddedildi" || found.status === "Onay bekliyor" ? "Planlandı" : found.status,
      },
    });
    await setPanelLineup(found.id, spec.guests);
    const panel = await prisma.panel.findUnique({ where: { id: found.id } });
    if (panel) await syncPanelAgenda(panel);
    for (const guest of spec.guests) await saveSpeaker(guest);
    console.log(`GUNCELLENDI ${spec.dates[spec.dates.length - 1]} ${spec.start} ${spec.title}`);
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
