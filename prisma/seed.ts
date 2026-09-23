import { PrismaClient, type Person } from "@prisma/client";
import bcrypt from "bcryptjs";
import seed from "./seed-data.json";
import { DEMO_PASSWORD, THEME_TR } from "../src/lib/constants";

const prisma = new PrismaClient();

function slugify(name: string) {
  return name
    .replace(/İ/g, "i")
    .replace(/I/g, "i")
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function emailFromSlug(slug: string) {
  return `${slug}@firma.cop31.tr`;
}

const STANDARD_RULES = [
  {
    title: "Akreditasyon ve giriş listesi",
    body: "Sahada görev alacak tüm personelin adı, soyadı, T.C./pasaport no ve görevini 25 Ekim 2026'ya kadar iletiniz. Blue Zone akreditasyonu COP31 organizasyonu üzerinden yürütülür.",
    dueDate: "2026-10-25",
  },
  {
    title: "Stand / katkı teyidi",
    body: "Pavilion içindeki katkı türünüzü (konuşmacı, video, eşantiyon, interaktif uygulama, ikram) ve ihtiyaç duyduğunuz m² / elektrik / AV kalemlerini teyit ediniz.",
    dueDate: "2026-10-15",
  },
  {
    title: "Konuşmacı özgeçmişi ve fotoğraf",
    body: "Panelist ve moderatörlerin kısa özgeçmişi (TR/EN, 120 kelime) ile yüksek çözünürlüklü fotoğrafını yükleyiniz.",
    dueDate: "2026-10-20",
  },
  {
    title: "Görsel kimlik ve materyal teslimi",
    body: "Video, pano, roll-up ve dijital ekran içerikleri COP31 ve Sağlık Bakanlığı görsel kimliğine uygun teslim edilmelidir. Son teslim: 30 Ekim 2026.",
    dueDate: "2026-10-30",
  },
  {
    title: "Pavilion kullanım kuralları",
    body: "Sıfır atık, tek kullanımlık plastik yasağı, gürültü seviyesi ve yan etkinlik saatlerine uyum zorunludur. Kurallar dökümanını indirip onaylayınız.",
    dueDate: "2026-10-10",
  },
  {
    title: "Teknik ihtiyaç formu",
    body: "Elektrik gücü, internet, canlı yayın, ekran ve sahne gereksinimlerini teknik forma işleyiniz.",
    dueDate: "2026-10-18",
  },
];

async function main() {
  await prisma.chatMessage.deleteMany();
  await prisma.thread.deleteMany();
  await prisma.inboxItem.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.panelMessage.deleteMany();
  await prisma.panelPerson.deleteMany();
  await prisma.panel.deleteMany();
  await prisma.person.deleteMany();
  await prisma.agendaItem.deleteMany();
  await prisma.thematicDay.deleteMany();
  await prisma.todo.deleteMany();
  await prisma.companyRule.deleteMany();
  await prisma.companySubmission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();
  await prisma.spaceZone.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.emailLog.deleteMany();
  await prisma.ambassadorPlacement.deleteMany();
  await prisma.ambassadorActivity.deleteMany();
  await prisma.ambassadorApplication.deleteMany();
  await prisma.formField.deleteMany();
  await prisma.eventSignup.deleteMany();
  await prisma.visitor.deleteMany();
  await prisma.pavilionEvent.deleteMany();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const trByKey = new Map(
    seed.companiesTr.map((c) => {
      const key = slugify(c.name.replace(" TR", "").replace("Nova", "Novo").replace("Fischer", "Fisher").replace("Medtronics", "Medtronic").replace("startups", "Startups").replace("cluster", "Cluster"));
      return [key, c] as const;
    })
  );

  const companies = [];
  for (const en of seed.companies) {
    const slug = slugify(en.name.replace(" TR", ""));
    const tr =
      trByKey.get(slug) ||
      seed.companiesTr.find((c) => slugify(c.name).includes(slug.split("-")[0])) ||
      null;
    const status =
      (en.context || "").toLowerCase().includes("not yet confirmed") ||
      (tr?.context || "").includes("ONAYLANMADI")
        ? "Beklemede"
        : "Onaylandı";
    const created = await prisma.company.create({
      data: {
        slug,
        name: tr?.name || en.name,
        nameEn: en.name,
        scope: tr?.scope || en.scope,
        topic: tr?.topic || en.topic,
        topicEn: en.topic,
        context: tr?.context || en.context,
        contextEn: en.context,
        participationDates: tr?.participationDates || en.participationDates,
        contribution: tr?.contribution || en.contribution,
        contributionEn: en.contribution,
        website: tr?.website || "",
        status,
        booth: "",
        contactEmail: emailFromSlug(slug),
        notes: "",
      },
    });
    companies.push(created);
  }

  const unepTr = seed.companiesTr.find((c) => c.name === "UNEP");
  if (unepTr && !companies.find((c) => c.slug === "unep")) {
    const created = await prisma.company.create({
      data: {
        slug: "unep",
        name: "UNEP",
        nameEn: "UNEP",
        scope: "UN",
        topic: "Uluslararası işbirliği",
        context: unepTr.context,
        contribution: unepTr.contribution,
        status: "Onaylandı",
        contactEmail: "unep@firma.cop31.tr",
      },
    });
    companies.push(created);
  }

  const booths = ["A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "C3", "D1", "D2", "D3", "E1", "E2", "E3", "F1"];
  for (const [i, company] of companies.entries()) {
    await prisma.company.update({
      where: { id: company.id },
      data: { booth: company.status === "Onaylandı" ? booths[i] || `S${i + 1}` : "" },
    });
    if (company.status === "Onaylandı") {
      for (const rule of STANDARD_RULES) {
        await prisma.companyRule.create({
          data: { companyId: company.id, ...rule, status: i % 5 === 0 ? "Tamamlandı" : "Bekliyor" },
        });
      }
    }
    await prisma.user.create({
      data: {
        email: company.contactEmail || emailFromSlug(company.slug),
        name: `${company.name} yetkilisi`,
        passwordHash,
        role: "FIRMA",
        title: "Firma yetkilisi",
        companyId: company.id,
      },
    });
  }

  await prisma.user.create({
    data: {
      email: "admin@cop31.saglik.gov.tr",
      name: "Pavilion Admin",
      passwordHash,
      role: "ADMIN",
      title: "Sistem yöneticisi",
    },
  });
  await prisma.user.create({
    data: {
      email: "sggm@cop31.saglik.gov.tr",
      name: "SGGM Koordinasyon",
      passwordHash,
      role: "SAGLIK",
      title: "Sağlığın Geliştirmesi Genel Müdürlüğü",
    },
  });

  for (const todo of seed.todos) {
    await prisma.todo.create({
      data: {
        no: todo.no,
        workPackage: todo.workPackage,
        activity: todo.activity,
        detail: todo.detail,
        startDate: todo.startDate || "",
        dueDate: todo.dueDate || "",
        unit: todo.unit,
        owner: todo.owner,
        status: todo.status,
        progress: todo.progress,
        risk: todo.risk,
        priority: todo.priority,
        notes: todo.notes,
      },
    });
  }

  const days = [];
  for (const day of seed.days) {
    const created = await prisma.thematicDay.create({
      data: {
        date: day.date,
        themeTr: THEME_TR[day.date] || day.theme,
        themeEn: day.theme,
        topic1: day.topic1,
        topic2: day.topic2,
      },
    });
    days.push(created);
  }

  const people: Person[] = [];
  for (const s of seed.speakers) {
    const person = await prisma.person.create({
      data: {
        name: s.name,
        role: s.role,
        organization: s.organization,
        track: s.track,
        kind: s.kind,
        note: s.note,
        email: `${slugify(s.name).replace(/-ad-bekleniyor/g, "tbd")}@cop31.tr`,
      },
    });
    people.push(person);
  }

  const findPerson = (q: string) =>
    people.find((p) => p.name.toLowerCase().includes(q.toLowerCase()) || p.organization.toLowerCase().includes(q.toLowerCase()));

  const panelSpecs = [
    {
      date: "2026-11-09",
      title: "Sağlık Günü Açılış Paneli — Sağlıklı İnsan, Sağlıklı Gezegen",
      start: "10:00",
      end: "11:30",
      partners: "MoH, WHO, UNEP",
      topic: "Gıda sistemleri, tarım ve iklim-sağlık bağlantısı",
      people: ["Emin", "Director General of Health Promotion", "UNEP"],
      mods: [],
    },
    {
      date: "2026-11-09",
      title: "Antimikrobiyal Direnç ve İklim",
      start: "14:00",
      end: "15:15",
      partners: "Astorg, MoH",
      topic: "İklim değişikliği ve artan antibiyotik direnci",
      people: ["Marc GATES"],
      mods: ["Emin"],
    },
    {
      date: "2026-11-10",
      title: "Sağlık Tesislerinde Yeşil Enerji",
      start: "10:30",
      end: "12:00",
      partners: "MoH, UN",
      topic: "Yenilenebilir enerji ve enerji verimliliği fizibilitesi",
      people: [],
      mods: [],
    },
    {
      date: "2026-11-11",
      title: "Hastanelerde Sıfır Atık ve Döngüsel Ekonomi",
      start: "11:00",
      end: "12:30",
      partners: "MoH, UN, Firmalar",
      topic: "Kamu-özel işbirliği ile yeni döngüsel modeller",
      people: ["Ahmet"],
      mods: [],
    },
    {
      date: "2026-11-12",
      title: "Dirençli Şehirler ve Halk Sağlığı",
      start: "10:00",
      end: "11:30",
      partners: "MoH, Yerel yönetimler",
      topic: "Hava kirliliği, iklim riskleri ve sağlık koruma",
      people: [],
      mods: [],
    },
    {
      date: "2026-11-13",
      title: "EBRD ve EXIM Bank: Yeşil Sağlık Finansmanı",
      start: "11:00",
      end: "12:30",
      partners: "EBRD, EXIM Bank, MoH",
      topic: "Yeşil dönüşüm için proje geliştirme ve finansmana erişim",
      people: ["ÜVEZ", "ÇAMÖZ"],
      mods: ["Nihan"],
    },
    {
      date: "2026-11-14",
      title: "Yarının Sağlık Profesyonelleri",
      start: "10:00",
      end: "11:30",
      partners: "Üniversiteler, İVEK, İSEK, Yinwest",
      topic: "Gençlik, Erasmus ve yeşil dönüşüm",
      people: ["Ahmet"],
      mods: [],
    },
    {
      date: "2026-11-16",
      title: "Yeşil Sağlık Girişimleri",
      start: "14:00",
      end: "15:30",
      partners: "Startuplar, MoH",
      topic: "Sağlık ve iklim kesişiminde yenilikçi çözümler",
      people: [],
      mods: [],
    },
    {
      date: "2026-11-18",
      title: "İklim, Eşitsizlik ve Kapsayıcı Geçiş",
      start: "10:30",
      end: "12:00",
      partners: "UN, MoH",
      topic: "Adil geçiş, geçim kaynakları ve sosyal koruma",
      people: ["Nihan"],
      mods: [],
    },
  ];

  for (const spec of panelSpecs) {
    const day = days.find((d) => d.date === spec.date);
    const panel = await prisma.panel.create({
      data: {
        title: spec.title,
        date: spec.date,
        startTime: spec.start,
        endTime: spec.end,
        theme: day?.themeTr || "",
        topic: spec.topic,
        partners: spec.partners,
        status: "Planlama",
      },
    });
    for (const q of spec.people) {
      const person = findPerson(q);
      if (person) {
        await prisma.panelPerson.create({
          data: { panelId: panel.id, personId: person.id, role: "panelist", confirmed: "Davet edildi" },
        });
      }
    }
    for (const q of spec.mods) {
      const person = findPerson(q);
      if (person) {
        await prisma.panelPerson.create({
          data: { panelId: panel.id, personId: person.id, role: "moderator", confirmed: "Davet edildi" },
        });
      }
    }
    if (day) {
      await prisma.agendaItem.create({
        data: {
          dayId: day.id,
          startTime: spec.start,
          endTime: spec.end,
          title: spec.title,
          description: spec.topic,
          type: "Panel",
          panelId: panel.id,
          location: "Sağlık Pavilionu — Ana Sahne",
          status: "Planlandı",
          sortOrder: 1,
        },
      });
    }
  }

  const extraAgenda: Record<string, { start: string; end: string; title: string; type: string; loc?: string }[]> = {
    "2026-11-09": [
      { start: "09:00", end: "09:45", title: "Pavilion resmi açılışı ve basın toplantısı", type: "Açılış" },
      { start: "15:30", end: "16:30", title: "Sanofi — KOAH ve iklim kaynaklı solunum sağlığı", type: "Seminer", loc: "Seminer Salonu" },
    ],
    "2026-11-10": [
      { start: "09:30", end: "10:15", title: "Humanis — karbon ayak izini azaltan üretim", type: "Quick Talk", loc: "Saha Quick Talk" },
      { start: "14:00", end: "15:00", title: "ATACH Day koordinasyonu (WHO)", type: "Ortak oturum" },
    ],
    "2026-11-11": [
      { start: "09:00", end: "18:00", title: "Liderler Zirvesi 1. Gün / Solak köyü sıfır atık ziyaret penceresi", type: "Zirve" },
      { start: "13:30", end: "14:15", title: "Atabay — solunum yolu hastalıkları ve iklim riski", type: "Quick Talk", loc: "Saha Quick Talk" },
    ],
    "2026-11-12": [
      { start: "09:00", end: "18:00", title: "Liderler Zirvesi 2. Gün", type: "Zirve" },
      { start: "14:00", end: "14:45", title: "Berko — aşı, salgın ve epidemiyoloji", type: "Quick Talk", loc: "Saha Quick Talk" },
      { start: "15:00", end: "16:00", title: "Novo Nordisk — BMI ve karbon ayak izi interaktif uygulama", type: "Deneyim", loc: "Deneyim Alanı" },
    ],
    "2026-11-15": [
      { start: "10:00", end: "18:00", title: "Antalya'da Bir Nefes — sosyal-kültürel program", type: "Kültür" },
    ],
    "2026-11-20": [
      { start: "11:00", end: "12:30", title: "Nihai müzakereler brifingi ve kapanış", type: "Kapanış" },
    ],
  };

  for (const [date, items] of Object.entries(extraAgenda)) {
    const day = days.find((d) => d.date === date);
    if (!day) continue;
    for (const [i, item] of items.entries()) {
      await prisma.agendaItem.create({
        data: {
          dayId: day.id,
          startTime: item.start,
          endTime: item.end,
          title: item.title,
          type: item.type,
          location: item.loc || "Sağlık Pavilionu",
          status: "Planlandı",
          sortOrder: i + 2,
        },
      });
    }
  }

  await prisma.spaceZone.createMany({
    data: [
      { name: "Karşılama / Resepsiyon", description: "Akreditasyon kontrolü ve karşılama", x: 4, y: 4, w: 22, h: 10, color: "#3D5A4C" },
      { name: "Ana Sahne", description: "Yüksek düzey paneller ve açılış", x: 30, y: 4, w: 38, h: 28, color: "#7A1C2B" },
      { name: "Oturma", description: "120 kişilik oturma düzeni", x: 30, y: 34, w: 38, h: 16, color: "#C4A574" },
      { name: "Seminer Salonu", description: "Sanofi / AstraZeneca oturumları", x: 72, y: 4, w: 24, h: 22, color: "#1F4E5F" },
      { name: "Deneyim Alanı", description: "İnteraktif uygulamalar, IoT, DEMO", x: 72, y: 28, w: 24, h: 22, color: "#2F6B4F" },
      { name: "Stant A — Astorg", description: "Mikrobiyal direnç", x: 4, y: 18, w: 12, h: 10, color: "#8B3A3A", companySlug: "astorg-thermo-fisher" },
      { name: "Stant B — World Medicine", description: "Kahve ve video", x: 16, y: 18, w: 12, h: 10, color: "#6B4F2A", companySlug: "world-medicine" },
      { name: "Stant C — Atabay", description: "Solunum sağlığı", x: 4, y: 30, w: 12, h: 10, color: "#4A6741", companySlug: "atabay-ilac" },
      { name: "Stant D — Humanis", description: "İlaç üretimi", x: 16, y: 30, w: 12, h: 10, color: "#3F5B73", companySlug: "humanis" },
      { name: "Stant E — Berko", description: "Aşı", x: 4, y: 42, w: 12, h: 10, color: "#5C4E7A", companySlug: "berko-ilac" },
      { name: "Stant F — Ertunç Özcan", description: "IoT tişört", x: 16, y: 42, w: 12, h: 10, color: "#2C6E6A", companySlug: "ertunc-ozcan" },
      { name: "Startup Köşesi", description: "Yinwest / İVEK / İSEK / Dilek Hanım", x: 4, y: 54, w: 24, h: 12, color: "#7A5A1C" },
      { name: "Backstage", description: "Konuşmacı hazırlık", x: 30, y: 52, w: 18, h: 14, color: "#44403C" },
      { name: "Depolama", description: "Sarf ve kargo", x: 50, y: 52, w: 18, h: 14, color: "#57534E" },
      { name: "Networking / Kahve", description: "World Medicine kahve sponsorluğu", x: 72, y: 52, w: 24, h: 14, color: "#7B4B2A" },
    ],
  });

  await prisma.setting.createMany({
    data: [
      { key: "todosSheetId", value: "1hmBcT-7ZsZXS0pTfviN8DcqdkICLUcqD" },
      { key: "companiesSheetId", value: "10uW2ZbzkW7x3DDwEBbWwo1jrjxxx3kAWcoopAeGU1JI" },
      { key: "pavilionName", value: "COP31 Sağlık Pavilionu (Yeşil Alan)" },
      { key: "venue", value: "Antalya EXPO Center — Blue Zone" },
    ],
  });

  const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@cop31.saglik.gov.tr" } });
  const atabay = companies.find((c) => c.slug.includes("atabay"));
  if (atabay) {
    const thread = await prisma.thread.create({
      data: {
        type: "inbox",
        title: "Stand elektrik gücü hk.",
        status: "Açık",
        companyId: atabay.id,
        createdById: (await prisma.user.findFirstOrThrow({ where: { companyId: atabay.id } })).id,
      },
    });
    await prisma.chatMessage.create({
      data: {
        threadId: thread.id,
        authorId: thread.createdById,
        body: "Merhaba, IoT demo için ek 220V hat ve 2 ekran noktası talep ediyoruz. Onaylar mısınız?",
      },
    });
    const qa = await prisma.thread.create({
      data: {
        type: "qa",
        title: "9 Kasım açılış oturumu — soru",
        status: "Açık",
        companyId: atabay.id,
        createdById: thread.createdById,
      },
    });
    await prisma.chatMessage.create({
      data: {
        threadId: qa.id,
        authorId: qa.createdById,
        body: "Açılış panelinde saha quick talk saatimiz 13:30. Ana sahne akışıyla çakışır mı?",
      },
    });
    await prisma.chatMessage.create({
      data: {
        threadId: qa.id,
        authorId: admin.id,
        body: "Çakışmaz; 13:30 saha alanı için rezerve. Ana sahne 12:30'da ara verecek.",
      },
    });
  }

  console.log("Seed complete. Demo password:", DEMO_PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
