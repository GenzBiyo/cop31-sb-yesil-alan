import { prisma } from "@/lib/prisma";
import { AMBASSADOR_INTRO, DEFAULT_FIELDS } from "@/lib/ambassador";

export async function ensureAmbassadorForm() {
  const intro = await prisma.setting.findUnique({ where: { key: "ambassadorIntro" } });
  if (!intro) {
    await prisma.setting.create({ data: { key: "ambassadorIntro", value: AMBASSADOR_INTRO } });
  }
  const count = await prisma.formField.count({ where: { formKey: "ambassador" } });
  if (count === 0) {
    await prisma.formField.createMany({
      data: DEFAULT_FIELDS.map((f) => ({ formKey: "ambassador", ...f })),
    });
  }
  const activities = await prisma.ambassadorActivity.count();
  if (activities === 0) {
    await prisma.ambassadorActivity.createMany({
      data: [
        {
          title: "Karşılama ve alan turu",
          date: "2026-11-09",
          startTime: "08:30",
          endTime: "13:00",
          location: "Resepsiyon",
          description: "Ziyaretçi karşılama, yönlendirme, pavilon turu.",
          roleNeed: "İletişim, İngilizce B1+",
          capacity: 10,
        },
        {
          title: "Sağlık Günü oturum desteği",
          date: "2026-11-09",
          startTime: "09:30",
          endTime: "16:00",
          location: "Ana Sahne",
          description: "Açılış ve panellerde mikrofonsuz saha desteği.",
          roleNeed: "Oturum desteği",
          capacity: 8,
        },
        {
          title: "Liderler Zirvesi / Solak köyü yönlendirme",
          date: "2026-11-11",
          startTime: "09:00",
          endTime: "18:00",
          location: "Pavilion + sıfır atık köyü",
          description: "Ziyaretçi akışı ve güzergah desteği.",
          roleNeed: "Saha yönlendirme",
          capacity: 12,
        },
        {
          title: "Startup köşesi ve gençlik etkileşimi",
          date: "2026-11-14",
          startTime: "10:00",
          endTime: "16:00",
          location: "Startup Köşesi",
          description: "Demo alanlarında karşılama ve çeviri.",
          roleNeed: "İngilizce, gençlik etkileşimi",
          capacity: 8,
        },
      ],
    });
  }
  await ensureSolaklarAmbassadorShifts();
  return {
    intro: (await prisma.setting.findUnique({ where: { key: "ambassadorIntro" } }))?.value || AMBASSADOR_INTRO,
    fields: await prisma.formField.findMany({ where: { formKey: "ambassador" }, orderBy: { sortOrder: "asc" } }),
  };
}

const SOLAKLAR_SHIFTS = [
  {
    title: "Solaklar karşılama ve QR kayıt",
    date: "2026-11-11",
    startTime: "08:00",
    endTime: "09:30",
    location: "Solaklar Köyü — giriş meydanı",
    description: "Ziyaretçi karşılama, matara kontrolü, QR kayıt, bez çanta dağıtımı.",
    roleNeed: "İletişim, İngilizce B1+",
    capacity: 8,
  },
  {
    title: "Solaklar sıfır atık yürüyüş rehberliği",
    date: "2026-11-11",
    startTime: "09:15",
    endTime: "12:30",
    location: "Solaklar — 5 durak güzergâh",
    description: "Küçük gruplara durak anlatımı; kompost istasyonu desteği.",
    roleNeed: "Saha rehberliği",
    capacity: 10,
  },
  {
    title: "Solaklar protokol güzergâh bekçisi",
    date: "2026-11-11",
    startTime: "13:30",
    endTime: "16:00",
    location: "Solaklar — meydan / bahçe / bakı",
    description: "Üst düzey ziyaret sırasında kalabalık kenarda; foto hattı tek taraflı.",
    roleNeed: "Protokol saha, sakin duruş",
    capacity: 12,
  },
  {
    title: "Solaklar ayırma oyunu ve nefes yürüyüşü",
    date: "2026-11-11",
    startTime: "15:15",
    endTime: "18:00",
    location: "Solaklar — meydan çimi + zeytin parkuru",
    description: "Gençlik oyunu, hediye teslimi, gün sonu yürüyüş eşliği.",
    roleNeed: "Gençlik etkileşimi",
    capacity: 8,
  },
  {
    title: "Solaklar direnç brifing ve NbS yürüyüşü",
    date: "2026-11-12",
    startTime: "08:00",
    endTime: "11:15",
    location: "Solaklar — gölgelik + dere hattı",
    description: "Sabah brifing oturma düzeni, yürüyüş durakları, su molası.",
    roleNeed: "Saha rehberliği",
    capacity: 10,
  },
  {
    title: "Solaklar sıcaklık ve hidrasyon istasyonu",
    date: "2026-11-12",
    startTime: "10:45",
    endTime: "13:00",
    location: "Solaklar — gölgelik sağlık çadırı",
    description: "Matara dolumu, gölge molası, anket kaydı.",
    roleNeed: "İlk yardım farkındalığı tercih",
    capacity: 8,
  },
  {
    title: "Solaklar imece bahçe ve kapanış",
    date: "2026-11-12",
    startTime: "13:15",
    endTime: "18:00",
    location: "Solaklar — ortak bahçe + meydan",
    description: "Tohum takası, hediye çarkı, kapanış halkası, alan temizliği imece.",
    roleNeed: "Saha + gençlik",
    capacity: 10,
  },
];

async function ensureSolaklarAmbassadorShifts() {
  for (const shift of SOLAKLAR_SHIFTS) {
    const existing = await prisma.ambassadorActivity.findFirst({ where: { title: shift.title } });
    if (existing) continue;
    await prisma.ambassadorActivity.create({ data: shift });
  }
}
