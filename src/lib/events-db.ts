import { prisma } from "./prisma";
import { EVENT_CATALOG } from "./event-catalog";

const SOLAKLAR_AGENDA: Record<string, { start: string; end: string; title: string; type: string; loc: string; description: string }[]> = {
  "2026-11-11": [
    {
      start: "08:30",
      end: "09:20",
      title: "Solaklar açık hava karşılama çemberi",
      type: "Outdoor",
      loc: "Solaklar Köyü — giriş meydanı",
      description: "Güvenlik, sıfır atık kuralı ve günlük güzergâh. Tek kullanımlık yok.",
    },
    {
      start: "09:30",
      end: "11:00",
      title: "Sıfır Atık Köyü açık hava yürüyüşü (5 durak)",
      type: "Outdoor",
      loc: "Solaklar — köy içi güzergâh",
      description: "Ayrıştırma, yağmur suyu, kompost, onarım, imece.",
    },
    {
      start: "11:00",
      end: "12:20",
      title: "Kompost ve toprak sağlığı istasyonu",
      type: "Outdoor",
      loc: "Solaklar — bahçe / kompost alanı",
      description: "Gıda israfı ve toprak-sağlık bağı.",
    },
    {
      start: "12:30",
      end: "13:30",
      title: "Paketsiz açık hava öğle molası",
      type: "Outdoor",
      loc: "Solaklar — gölgelik / zeytin altı",
      description: "Yerel mevsim ürünü; sıfır atık ikram protokolü.",
    },
    {
      start: "14:00",
      end: "15:20",
      title: "Üst düzey ziyaret açık hava güzergâhı",
      type: "Protokol",
      loc: "Solaklar — meydan, bahçe, bakı noktası",
      description: "Liderler Zirvesi 1. Gün köy turu durakları. Elçiler kenarda.",
    },
    {
      start: "15:30",
      end: "16:30",
      title: "Açık hava atık ayırma yarışı",
      type: "Outdoor",
      loc: "Solaklar — meydan çimi",
      description: "Hediyeli gençlik oyunu; tohum topu.",
    },
    {
      start: "16:45",
      end: "17:45",
      title: "Gün sonu nefes ve gölge yürüyüşü",
      type: "Outdoor",
      loc: "Solaklar — zeytin / tarla kenarı",
      description: "Yavaş tempo; iklim ve solunum sağlığı.",
    },
  ],
  "2026-11-12": [
    {
      start: "08:30",
      end: "09:20",
      title: "Dirençli yerleşim açık hava brifingi",
      type: "Outdoor",
      loc: "Solaklar — gölgelik brifing çemberi",
      description: "Sel, sıcak dalgası ve suyu köy ölçeğinde okuma.",
    },
    {
      start: "09:30",
      end: "11:00",
      title: "Doğa temelli çözüm yürüyüşü",
      type: "Outdoor",
      loc: "Solaklar — dere / tarla / gölge hattı",
      description: "Taşkın çayırı, gölge ağaçları, geçirgen zemin.",
    },
    {
      start: "11:00",
      end: "12:20",
      title: "Açık hava sıcaklık, su ve hava istasyonu",
      type: "Outdoor",
      loc: "Solaklar — gölgelik sağlık çadırı",
      description: "Termometre, matara dolumu, hidrasyon anketi.",
    },
    {
      start: "13:30",
      end: "15:00",
      title: "İmece: tohum ve aromatik bitki bahçesi",
      type: "Outdoor",
      loc: "Solaklar — ortak bahçe",
      description: "Kekik, adaçayı, nane; tohum takası.",
    },
    {
      start: "15:15",
      end: "16:30",
      title: "Solaklar açık hava hediye çarkı",
      type: "Outdoor",
      loc: "Solaklar — meydan",
      description: "Tek kullanımlıksız hediyeler: tohum, bez, ahşap.",
    },
    {
      start: "16:45",
      end: "17:45",
      title: "Kapanış halkası ve teşekkür yürüyüşü",
      type: "Outdoor",
      loc: "Solaklar — meydan",
      description: "İki günün öğrenilenleri ve alan temizliği imece.",
    },
  ],
};

const SOLAKLAR_NOTES: Record<string, string> = {
  "2026-11-11":
    "Solaklar Köyü sıfır atık açık hava günü (08:30–17:45). Tek kullanımlık yasak; matara zorunlu. Üst düzey ziyaret penceresi 14:00–15:20. QR: /solaklar",
  "2026-11-12":
    "Solaklar Köyü direnç ve doğa temelli çözüm günü (08:30–17:45). Sıcaklık/su istasyonu + imece bahçe + kapanış halkası. QR: /solaklar",
};

const eventsFlag = globalThis as unknown as { eventsReady?: boolean };

export async function ensureEvents() {
  if (eventsFlag.eventsReady) return;
  const catalogCount = await prisma.pavilionEvent.count();
  if (catalogCount >= EVENT_CATALOG.length) {
    eventsFlag.eventsReady = true;
    return;
  }
  for (const e of EVENT_CATALOG) {
    const existing = await prisma.pavilionEvent.findUnique({ where: { slug: e.slug } });
    if (existing) continue;
    await prisma.pavilionEvent.create({
      data: {
        slug: e.slug,
        title: e.title,
        type: e.type,
        companyName: e.companyName,
        topic: e.topic,
        date: e.date,
        startTime: e.startTime,
        endTime: e.endTime,
        location: e.location,
        description: e.description,
        gift: e.gift,
        config: JSON.stringify(e.config),
        published: true,
      },
    });
  }
  await ensureSolaklarAgenda();
  eventsFlag.eventsReady = true;
}

export async function ensureSolaklarAgenda() {
  for (const [date, items] of Object.entries(SOLAKLAR_AGENDA)) {
    const day = await prisma.thematicDay.findUnique({ where: { date } });
    if (!day) continue;
    if (!day.notes.includes("Solaklar")) {
      await prisma.thematicDay.update({
        where: { id: day.id },
        data: { notes: [day.notes, SOLAKLAR_NOTES[date]].filter(Boolean).join("\n") },
      });
    }
    const existing = await prisma.agendaItem.findMany({ where: { dayId: day.id }, select: { title: true } });
    const titles = new Set(existing.map((a) => a.title));
    let sort = existing.length + 10;
    for (const item of items) {
      if (titles.has(item.title)) continue;
      await prisma.agendaItem.create({
        data: {
          dayId: day.id,
          startTime: item.start,
          endTime: item.end,
          title: item.title,
          type: item.type,
          location: item.loc,
          description: item.description,
          status: "Planlandı",
          sortOrder: sort++,
        },
      });
    }
  }
}
