import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "./prisma";

export type GiveawaySeed = {
  slug: string;
  kind: "esantiyon";
  sku: string;
  offerNo: string;
  title: string;
  detail: string;
  printNote: string;
  quantity: number;
  /** Birim fiyat, kuruş, KDV hariç. */
  unitPrice: number;
  vatRate: number;
  priceNote: string;
  imagePath: string;
  sourceUrl: string;
  sortOrder: number;
};

/** Sağlık Bakanlığı fiyat ve adedi sonradan değiştirir. */
export const GIVEAWAY_CATALOG: GiveawaySeed[] = [
  {
    slug: "gs-8700-tek-renk",
    kind: "esantiyon",
    sku: "8700",
    offerNo: "560",
    title: "Ham bez çanta 35×40 cm",
    detail: "140 gr ham bez kumaş, 70 cm sap. Plastik poşet yerine kullanılır.",
    printNote: "Çift taraf, tek renk baskı",
    quantity: 10000,
    unitPrice: 2890,
    vatRate: 20,
    priceNote: "KDV hariç birim fiyat. Sağlık Bakanlığı adet ve fiyatı güncelleyebilir.",
    imagePath: "/giveaways/hambez.jpg",
    sourceUrl: "https://greenstyle.com.tr/urun/hambez-canta-35x40cm/",
    sortOrder: 10,
  },
  {
    slug: "gs-3066-saat",
    kind: "esantiyon",
    sku: "3066",
    offerNo: "560",
    title: "Masaüstü kablosuz şarjlı bambu dijital masa saati",
    detail: "Bambu gövdeli masa saati, kablosuz şarjlı.",
    printNote: "Baskısız",
    quantity: 50,
    unitPrice: 65700,
    vatRate: 20,
    priceNote: "KDV hariç birim fiyat.",
    imagePath: "",
    sourceUrl: "",
    sortOrder: 20,
  },
  {
    slug: "gs-2153-mantar",
    kind: "esantiyon",
    sku: "2153",
    offerNo: "560",
    title: "Kutulu VIP mantar hediyelik set",
    detail: "Kutulu mantar hediyelik set.",
    printNote: "Baskısız",
    quantity: 20,
    unitPrice: 127500,
    vatRate: 20,
    priceNote: "KDV hariç birim fiyat.",
    imagePath: "",
    sourceUrl: "",
    sortOrder: 30,
  },
  {
    slug: "gs-6141-termos",
    kind: "esantiyon",
    sku: "6141",
    offerNo: "560",
    title: "Bambu termos",
    detail: "Bambu gövdeli, yeniden doldurulabilir termos. Tek kullanımlık plastik şişenin yerine geçer.",
    printNote: "Baskısız",
    quantity: 100,
    unitPrice: 41400,
    vatRate: 20,
    priceNote: "KDV hariç birim fiyat.",
    imagePath: "/giveaways/bambu-termos.jpg",
    sourceUrl: "https://greenstyle.com.tr/urun/6141-bambu-termos/",
    sortOrder: 40,
  },
  {
    slug: "gs-4832-baskisiz",
    kind: "esantiyon",
    sku: "4832",
    offerNo: "560",
    title: "Tohumlu kurşun kalem",
    detail: "Geri dönüşümlü gövdeli kurşun kalem. İçindeki tohum kullanımdan sonra toprağa ekilir.",
    printNote: "Baskısız",
    quantity: 1000,
    unitPrice: 940,
    vatRate: 20,
    priceNote: "KDV hariç birim fiyat.",
    imagePath: "/giveaways/kursun.jpg",
    sourceUrl: "https://greenstyle.com.tr/urun/4832-tohumlu-kursun-kalem/",
    sortOrder: 50,
  },
  {
    slug: "gs-2518-feslegen",
    kind: "esantiyon",
    sku: "2518",
    offerNo: "561",
    title: "Fesleğen hobi dikim kiti",
    detail: "Tohum seçenekleri: fesleğen, çam ya da lavanta. Saksı, tohum ve toprak.",
    printNote: "Saksı üzeri, tek yön logo baskı",
    quantity: 8000,
    unitPrice: 1740,
    vatRate: 20,
    priceNote: "KDV hariç birim fiyat.",
    imagePath: "/giveaways/bitki.webp",
    sourceUrl: "https://greenstyle.com.tr/urun/bitki-yetistirme-kiti/",
    sortOrder: 60,
  },
  {
    slug: "gs-8700-iki-renk",
    kind: "esantiyon",
    sku: "8700",
    offerNo: "561",
    title: "Ham bez çanta 35×40 cm",
    detail: "130 gr ham bez kumaş, 70 cm sap. Plastik poşet yerine kullanılır.",
    printNote: "Çift taraf, iki renk baskı",
    quantity: 3000,
    unitPrice: 3290,
    vatRate: 10,
    priceNote: "KDV hariç birim fiyat. Bu kalemde KDV %10.",
    imagePath: "/giveaways/hambez.jpg",
    sourceUrl: "https://greenstyle.com.tr/urun/hambez-canta-35x40cm/",
    sortOrder: 70,
  },
  {
    slug: "gs-4835-tukenmez",
    kind: "esantiyon",
    sku: "4835",
    offerNo: "561",
    title: "Tohumlu tükenmez kalem",
    detail: "Karaçam tohumlu, kılıflı. Geri dönüşümlü gövde. Kullanımdan sonra tohum ekilebilir.",
    printNote: "Tek taraf baskı",
    quantity: 5000,
    unitPrice: 2140,
    vatRate: 20,
    priceNote: "KDV hariç birim fiyat.",
    imagePath: "/giveaways/tukenmez.webp",
    sourceUrl: "https://greenstyle.com.tr/urun/4835-tohumlu-tukenmez-kalem/",
    sortOrder: 80,
  },
  {
    slug: "gs-4832-baskili",
    kind: "esantiyon",
    sku: "4832",
    offerNo: "561",
    title: "Tohumlu kurşun kalem",
    detail: "Karaçam tohumlu, kılıflı. İçindeki tohum kullanımdan sonra toprağa ekilir.",
    printNote: "Tek taraf baskı",
    quantity: 10000,
    unitPrice: 950,
    vatRate: 20,
    priceNote: "KDV hariç birim fiyat.",
    imagePath: "/giveaways/kursun.jpg",
    sourceUrl: "https://greenstyle.com.tr/urun/4832-tohumlu-kursun-kalem/",
    sortOrder: 90,
  },
  {
    slug: "gs-8615-usb",
    kind: "esantiyon",
    sku: "8615",
    offerNo: "561",
    title: "16 GB ahşap USB bellek",
    detail: "Ahşap gövdeli bellek. İçine pavilyonun iklim ve sağlık notları konabilir.",
    printNote: "Tek taraf baskı",
    quantity: 200,
    unitPrice: 27500,
    vatRate: 20,
    priceNote: "KDV hariç birim fiyat.",
    imagePath: "/giveaways/usb.jpg",
    sourceUrl: "https://greenstyle.com.tr/urun/8615-ahsap-usb-bellek/",
    sortOrder: 100,
  },
  {
    slug: "gs-6168-termos",
    kind: "esantiyon",
    sku: "6168",
    offerNo: "561",
    title: "Bambu çelik termos 500 ml",
    detail: "Bambu ve çelik termos, 500 ml. İkram suyu bu kaba doldurulur.",
    printNote: "Tek taraf baskı",
    quantity: 100,
    unitPrice: 63500,
    vatRate: 20,
    priceNote: "KDV hariç birim fiyat.",
    imagePath: "/giveaways/bambu-kupa.png",
    sourceUrl: "https://greenstyle.com.tr/urun/bambu-celik-kupa-termos/",
    sortOrder: 110,
  },
  {
    slug: "gs-4857-kart",
    kind: "esantiyon",
    sku: "4857",
    offerNo: "561",
    title: "Tohumlu kraft kart 7×7 cm",
    detail: "Kraft tohum kartı, çam tohumlu. Kartın mesaj alanı motto için ayrılır.",
    printNote: "Çift taraf baskı",
    quantity: 20000,
    unitPrice: 455,
    vatRate: 20,
    priceNote: "KDV hariç birim fiyat.",
    imagePath: "/giveaways/tohum-kart.jpg",
    sourceUrl: "https://greenstyle.com.tr/urun/tohumlu-kart-kraft-7x7cm-cam/",
    sortOrder: 120,
  },
  {
    slug: "gs-3077-saat",
    kind: "esantiyon",
    sku: "3077",
    offerNo: "",
    title: "Bambu kablosuz şarjlı masa saati",
    detail: "17×7,5 cm, 264 g. Alarm, kablosuz şarj (15W), dijital termometre ve dahili pil.",
    printNote: "Logo baskı",
    quantity: 20,
    unitPrice: 106750,
    vatRate: 20,
    priceNote: "KDV hariç, yayımlanan en yüksek birim fiyat. Sağlık Bakanlığı fiyatı değiştirebilir.",
    imagePath: "/giveaways/saat-3077.jpg",
    sourceUrl: "https://greenstyle.com.tr/urun/bambu-kablosuz-sarjli-masa-saati-3077/",
    sortOrder: 130,
  },
  {
    slug: "gs-3068-hoparlor",
    kind: "esantiyon",
    sku: "3068",
    offerNo: "",
    title: "5’i 1 arada kablosuz şarjlı bambu bluetooth hoparlör",
    detail: "Alarmlı saat, 15W kablosuz şarj, üç kademeli lamba ve döner telefon standı.",
    printNote: "Logo baskı",
    quantity: 10,
    unitPrice: 219500,
    vatRate: 20,
    priceNote: "KDV hariç, yayımlanan en yüksek birim fiyat. Sağlık Bakanlığı fiyatı değiştirebilir.",
    imagePath: "/giveaways/hoparlor-3068.jpg",
    sourceUrl: "https://greenstyle.com.tr/urun/3068-5i-1-arada-kablosuz-sarjli-bluetooth-hoparlor/",
    sortOrder: 140,
  },
  {
    slug: "gs-8013-speaker",
    kind: "esantiyon",
    sku: "8013",
    offerNo: "",
    title: "Bluetooth speaker",
    detail: "Bluetooth 5.0, 3W, bambu ve buğday samanı gövde. 6,5×6,5×3,5 cm. Taşıma sapı ve 3,5 mm jak.",
    printNote: "Logo baskı",
    quantity: 100,
    unitPrice: 82900,
    vatRate: 20,
    priceNote: "KDV hariç, yayımlanan en yüksek birim fiyat. Sağlık Bakanlığı fiyatı değiştirebilir.",
    imagePath: "/giveaways/speaker-8013.jpg",
    sourceUrl: "https://greenstyle.com.tr/urun/8013-bluetooth-speaker/",
    sortOrder: 150,
  },
];

const LEGACY_SLUGS = [
  "bitki-yetistirme-kiti",
  "bambu-termos-celik-bardak",
  "kanvas-canta",
  "hambez-canta",
  "tohumlu-tukenmez",
  "tohumlu-kursun",
  "ahsap-usb",
  "bambu-termos",
  "bambu-celik-kupa",
  "tohumlu-kart",
];

const QUOTE_FLAG = "giveawayQuote561";
let quoteReady = false;

function plainPriceNote(note: string) {
  return note.replace(/^Greenstyle(?:\s+teklif)?\s+\S+\.\s*/i, "").trim();
}

export async function ensureGiveawayCatalog() {
  if (quoteReady) return;
  const branded = await prisma.giveawayItem.findMany({
    where: { priceNote: { contains: "Greenstyle" } },
    select: { id: true, priceNote: true },
  });
  for (const row of branded) {
    const priceNote = plainPriceNote(row.priceNote);
    if (priceNote !== row.priceNote) {
      await prisma.giveawayItem.update({ where: { id: row.id }, data: { priceNote } });
    }
  }
  const flag = await prisma.setting.findUnique({ where: { key: QUOTE_FLAG }, select: { key: true } });
  if (!flag) {
    for (const item of GIVEAWAY_CATALOG) {
      await prisma.giveawayItem.upsert({
        where: { slug: item.slug },
        create: item,
        update: {
          sku: item.sku,
          offerNo: item.offerNo,
          title: item.title,
          detail: item.detail,
          printNote: item.printNote,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          vatRate: item.vatRate,
          priceNote: item.priceNote,
          imagePath: item.imagePath,
          sourceUrl: item.sourceUrl,
          sortOrder: item.sortOrder,
          published: true,
          kind: item.kind,
        },
      });
    }
    await prisma.giveawayItem.updateMany({
      where: { slug: { in: LEGACY_SLUGS } },
      data: { published: false },
    });
    await prisma.setting.upsert({
      where: { key: QUOTE_FLAG },
      update: { value: "1" },
      create: { key: QUOTE_FLAG, value: "1" },
    });
  }
  for (const item of GIVEAWAY_CATALOG) {
    const existing = await prisma.giveawayItem.findUnique({ where: { slug: item.slug }, select: { id: true } });
    if (!existing) await prisma.giveawayItem.create({ data: item });
  }
  quoteReady = true;
}

export async function saveGiveawayImage(file: File) {
  if (file.size > 5 * 1024 * 1024) throw new Error("Fotoğraf en fazla 5 MB olabilir");
  if (!(file.type || "").startsWith("image/")) throw new Error("JPG, PNG veya WebP fotoğraf yükleyin");
  const ext = file.type.includes("png") ? "png" : file.type.includes("webp") ? "webp" : "jpg";
  const dir = path.join(process.cwd(), "public", "uploads", "giveaways");
  await mkdir(dir, { recursive: true });
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
  return `/uploads/giveaways/${filename}`;
}

export function packageSlug(title: string) {
  const base = title
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "paket";
  return `${base}-${Date.now().toString(36)}`;
}

export function tlToKurus(raw: unknown): number | null {
  const s = String(raw ?? "").trim().replace(/\s/g, "");
  if (!s) return null;
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}
