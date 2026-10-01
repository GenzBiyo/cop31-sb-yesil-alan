import { prisma } from "@/lib/prisma";
import { AMBASSADOR_INTRO, DEFAULT_FIELDS } from "@/lib/ambassador";

const PREVIOUS_INTRO_STARTS = ["Önemli not: Konaklama sağlanmamaktadır.", "COP31 Sağlık Elçileri Gönüllü Öğrenci Çağrısı"];

const ADDED_KEYS = ["needsSupport", "experience"];

async function upgradeFields() {
  const existing = await prisma.formField.findMany({ where: { formKey: "ambassador" } });
  const byKey = new Map(existing.map((f) => [f.key, f]));
  const city = byKey.get("city");
  const cityDefault = DEFAULT_FIELDS.find((f) => f.key === "city")!;
  if (city && city.type === "text") {
    await prisma.formField.update({
      where: { id: city.id },
      data: { type: cityDefault.type, label: cityDefault.label, options: cityDefault.options, help: cityDefault.help },
    });
  }
  const missing = DEFAULT_FIELDS.filter((f) => ADDED_KEYS.includes(f.key) && !byKey.has(f.key));
  if (missing.length === 0) return;
  await prisma.formField.createMany({ data: missing.map((f) => ({ formKey: "ambassador", ...f })) });
  for (const f of DEFAULT_FIELDS) {
    await prisma.formField.updateMany({ where: { formKey: "ambassador", key: f.key }, data: { sortOrder: f.sortOrder } });
  }
}

export async function ensureAmbassadorForm() {
  const intro = await prisma.setting.findUnique({ where: { key: "ambassadorIntro" } });
  if (!intro) {
    await prisma.setting.create({ data: { key: "ambassadorIntro", value: AMBASSADOR_INTRO } });
  } else if (PREVIOUS_INTRO_STARTS.some((start) => intro.value.startsWith(start)) || intro.value.includes("Solaklar")) {
    await prisma.setting.update({ where: { key: "ambassadorIntro" }, data: { value: AMBASSADOR_INTRO } });
  }
  const count = await prisma.formField.count({ where: { formKey: "ambassador" } });
  if (count === 0) {
    await prisma.formField.createMany({
      data: DEFAULT_FIELDS.map((f) => ({ formKey: "ambassador", ...f })),
    });
  } else {
    await upgradeFields();
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
          title: "Liderler Zirvesi pavyon yönlendirme",
          date: "2026-11-11",
          startTime: "09:00",
          endTime: "18:00",
          location: "Sağlık Pavilionu",
          description: "Ziyaretçi akışı ve pavyon içi yönlendirme.",
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
  await prisma.ambassadorActivity.deleteMany({
    where: {
      OR: [
        { title: { contains: "Solaklar" } },
        { title: { contains: "Solak köy" } },
        { location: { contains: "Solaklar" } },
      ],
    },
  });
  return {
    intro: (await prisma.setting.findUnique({ where: { key: "ambassadorIntro" } }))?.value || AMBASSADOR_INTRO,
    fields: await prisma.formField.findMany({ where: { formKey: "ambassador" }, orderBy: { sortOrder: "asc" } }),
  };
}
