import { prisma } from "./prisma";

export type GiveawaySeed = {
  slug: string;
  kind: "esantiyon" | "ikram";
  title: string;
  detail: string;
  quantity: number;
  /** Birim fiyat, kuruş. 0 ise satıcı sayfada fiyat yayımlamamıştır. */
  unitPrice: number;
  priceNote: string;
  imagePath: string;
  sourceUrl: string;
  sortOrder: number;
};

/** Örnek katalog. Yönetici atamasını ve adedi sonradan değiştirebilir; mevcut kayıtların üzerine yazılmaz. */
export const GIVEAWAY_CATALOG: GiveawaySeed[] = [
  {
    slug: "bitki-yetistirme-kiti",
    kind: "esantiyon",
    title: "Bitki yetiştirme kiti",
    detail: "8 oz karton saksı, kapak, tohum ve toprak. Fesleğen, kekik, lavanta, maydanoz gibi yenilebilir veya kokulu bitki tohumları.",
    quantity: 1000,
    unitPrice: 1190,
    priceNote: "KDV hariç. 1.000 adet minimum sipariş fiyatı (sayfadaki aralık 11,40–11,90 ₺).",
    imagePath: "/giveaways/bitki.webp",
    sourceUrl: "https://greenstyle.com.tr/urun/bitki-yetistirme-kiti/",
    sortOrder: 10,
  },
  {
    slug: "bambu-termos-celik-bardak",
    kind: "esantiyon",
    title: "Bambu kapaklı termos ve çelik bardak seti",
    detail: "550 ml bambu kapaklı termos ve 350 ml çelik bardak. Yeniden doldurulabilir set. Pet şişe yerine kullanılır.",
    quantity: 100,
    unitPrice: 156094,
    priceNote: "KDV hariç. 100 adet için yayımlanan birim fiyat.",
    imagePath: "/giveaways/termos-set.webp",
    sourceUrl: "https://promozone.com.tr/urun/550-ml-bambu-kapakli-termos-ve-350-ml-celik-bardak-seti-pz6652/PZ6652",
    sortOrder: 20,
  },
  {
    slug: "kanvas-canta",
    kind: "esantiyon",
    title: "Kanvas çanta 16×22×5 cm",
    detail: "300 gr kanvas kumaş, küçük bez çanta. Kozmetik veya numune konulmaz.",
    quantity: 500,
    unitPrice: 0,
    priceNote: "Satıcı birim fiyatı yayımlamamış. Satın alma sayfasından teklif istenir.",
    imagePath: "/giveaways/kanvas.jpg",
    sourceUrl: "https://greenstyle.com.tr/urun/kanvas-makyaj-cantasi-16x22x5-cm/",
    sortOrder: 30,
  },
  {
    slug: "hambez-canta",
    kind: "esantiyon",
    title: "Ham bez çanta 35×40 cm",
    detail: "140 gr ham bez, 70 cm sap. Plastik poşet yerine kullanılır.",
    quantity: 500,
    unitPrice: 3990,
    priceNote: "KDV hariç. Çift taraf tek renk baskı dahil. 500 adet minimum sipariş fiyatı (aralık 29,90–39,90 ₺).",
    imagePath: "/giveaways/hambez.jpg",
    sourceUrl: "https://greenstyle.com.tr/urun/hambez-canta-35x40cm/",
    sortOrder: 40,
  },
  {
    slug: "tohumlu-tukenmez",
    kind: "esantiyon",
    title: "Tohumlu tükenmez kalem",
    detail: "Geri dönüşümlü karton gövde, yaprak desenli klips, mavi mürekkep. İçinde karaçam tohumu vardır; kullanımdan sonra ekilebilir.",
    quantity: 1000,
    unitPrice: 2290,
    priceNote: "KDV hariç. Sayfadaki birim aralığının üst ucu (19,90–22,90 ₺).",
    imagePath: "/giveaways/tukenmez.webp",
    sourceUrl: "https://greenstyle.com.tr/urun/4835-tohumlu-tukenmez-kalem/",
    sortOrder: 50,
  },
  {
    slug: "tohumlu-kursun",
    kind: "esantiyon",
    title: "Tohumlu kurşun kalem",
    detail: "Geri dönüşümlü gövdeli kurşun kalem. İçindeki tohum kullanımdan sonra toprağa ekilir.",
    quantity: 1000,
    unitPrice: 1075,
    priceNote: "KDV hariç. Sayfadaki birim aralığının üst ucu (9,90–10,75 ₺).",
    imagePath: "/giveaways/kursun.jpg",
    sourceUrl: "https://greenstyle.com.tr/urun/4832-tohumlu-kursun-kalem/",
    sortOrder: 60,
  },
  {
    slug: "ahsap-usb",
    kind: "esantiyon",
    title: "Ahşap USB bellek",
    detail: "Ahşap gövdeli bellek. İçine pavilyonun iklim ve sağlık notları konabilir. Plastik gövde kullanılmaz.",
    quantity: 200,
    unitPrice: 0,
    priceNote: "Satıcı birim fiyatı yayımlamamış. Satın alma sayfasından teklif istenir.",
    imagePath: "/giveaways/usb.jpg",
    sourceUrl: "https://greenstyle.com.tr/urun/8615-ahsap-usb-bellek/",
    sortOrder: 70,
  },
  {
    slug: "bambu-termos",
    kind: "esantiyon",
    title: "Bambu termos",
    detail: "Bambu gövdeli, yeniden doldurulabilir termos. Tek kullanımlık plastik şişenin yerine geçer.",
    quantity: 100,
    unitPrice: 46450,
    priceNote: "KDV hariç. Sayfadaki birim aralığının üst ucu (399,90–464,50 ₺).",
    imagePath: "/giveaways/bambu-termos.jpg",
    sourceUrl: "https://greenstyle.com.tr/urun/6141-bambu-termos/",
    sortOrder: 80,
  },
  {
    slug: "bambu-celik-kupa",
    kind: "esantiyon",
    title: "Bambu çelik kupa termos",
    detail: "Bambu ve çelik kupa termos, yaklaşık 500 ml. İkram suyu bu kaba doldurulur.",
    quantity: 100,
    unitPrice: 69000,
    priceNote: "KDV hariç. Sayfadaki birim aralığının üst ucu (619,00–690,00 ₺).",
    imagePath: "/giveaways/bambu-kupa.png",
    sourceUrl: "https://greenstyle.com.tr/urun/bambu-celik-kupa-termos/",
    sortOrder: 90,
  },
  {
    slug: "tohumlu-kart",
    kind: "esantiyon",
    title: "Tohumlu kraft kart 7×7 cm",
    detail: "Kraft tohum kartı, çam tohumlu. Kartın mesaj alanı motto için ayrılır.",
    quantity: 10000,
    unitPrice: 1000,
    priceNote: "KDV hariç. Çift taraf baskı dahil. Sayfadaki birim aralığının üst ucu (4,85–10,00 ₺).",
    imagePath: "/giveaways/tohum-kart.jpg",
    sourceUrl: "https://greenstyle.com.tr/urun/tohumlu-kart-kraft-7x7cm-cam/",
    sortOrder: 100,
  },
];

export async function ensureGiveawayCatalog() {
  for (const item of GIVEAWAY_CATALOG) {
    const existing = await prisma.giveawayItem.findUnique({ where: { slug: item.slug }, select: { id: true, priceNote: true } });
    if (!existing) {
      await prisma.giveawayItem.create({ data: item });
      continue;
    }
    if (existing.priceNote) continue;
    await prisma.giveawayItem.update({
      where: { slug: item.slug },
      data: {
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        priceNote: item.priceNote,
        sourceUrl: item.sourceUrl,
      },
    });
  }
}
