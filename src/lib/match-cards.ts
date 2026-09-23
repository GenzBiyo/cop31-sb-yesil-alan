export type MeterKind = "clean" | "health" | "joy";

export type ConceptPair = {
  id: string;
  n: number;
  title: string;
  short: string;
  hint: string;
  meter: MeterKind;
};

export const CONCEPTS: ConceptPair[] = [
  {
    id: "c1",
    n: 1,
    title: "İklim değişikliği ve sağlığın geliştirilmesi",
    short: "Sağlığı geliştir",
    hint: "Sağlıklı yaşam, beslenme, hareket, dumansız nefes",
    meter: "health",
  },
  {
    id: "c2",
    n: 2,
    title: "Sağlıklı ve iklime dirençli şehirler",
    short: "Dirençli şehir",
    hint: "Yürünebilir kent, yeşil alan, temiz hava",
    meter: "joy",
  },
  {
    id: "c3",
    n: 3,
    title: "Aşırı sıcaklıklar ve sağlık",
    short: "Aşırı sıcak",
    hint: "Erken uyarı, gölge, kırılgan grupları koru",
    meter: "health",
  },
  {
    id: "c4",
    n: 4,
    title: "İklim ve sağlık okuryazarlığı",
    short: "Okuryazarlık",
    hint: "Doğru bilgi, infodemiye karşı net risk iletişimi",
    meter: "health",
  },
  {
    id: "c5",
    n: 5,
    title: "Çocuklar, gençler ve iklim",
    short: "Çocuk ve genç",
    hint: "Çocuk sağlığı, katılım, iklim kaygısını esenliğe çevir",
    meter: "joy",
  },
  {
    id: "c6",
    n: 6,
    title: "Kadın, iklim ve sağlık",
    short: "Kadın ve sağlık",
    hint: "Anne sağlığı, gebelikte sıcak, afetlerde kadın",
    meter: "health",
  },
  {
    id: "c7",
    n: 7,
    title: "İklim değişikliği ve afetler",
    short: "Afetler",
    hint: "Toplum direnci, psikososyal destek, kırılgan topluluklar",
    meter: "health",
  },
  {
    id: "c8",
    n: 8,
    title: "Hava kirliliği ve sağlık",
    short: "Hava kirliliği",
    hint: "Temiz hava, sağlıklı nefes, aktif ulaşım",
    meter: "clean",
  },
  {
    id: "c9",
    n: 9,
    title: "Kırılgan gruplar ve sağlıkta eşitlik",
    short: "Kırılgan gruplar",
    hint: "Yaşlı, engelli, göçmen, kronik hasta — kimse geride kalmasın",
    meter: "health",
  },
  {
    id: "g1",
    n: 10,
    title: "Çevre kirliliği azalsın",
    short: "Kirlilik azalsın",
    hint: "Dumanı, atığı ve kirli havayı birlikte temizle",
    meter: "clean",
  },
  {
    id: "g2",
    n: 11,
    title: "Toplum sağlığı artsın",
    short: "Toplum sağlığı",
    hint: "Koruyucu sağlık, eşit erişim, dirençli mahalle",
    meter: "health",
  },
  {
    id: "g3",
    n: 12,
    title: "Mutsuzken mutlu olsun",
    short: "Mutlu olsun",
    hint: "Yeşil alan, birlikte hareket, esenlik",
    meter: "joy",
  },
];

export const MEMORY_IDS = ["c8", "c2", "c3", "c5", "c1", "c9", "g1", "g3"];
export const MATCH_IDS = ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9"];

export const SAMPLE_MATCH = {
  slug: "yesil-dokunus",
  title: "Yeşil Dokunuş",
  description:
    "Telefondan hafıza ve eşleştirme oyna. Dokuz iklim-sağlık konseptini tuttur; kirlilik azalsın, toplum sağlığı ve mutluluk artsın. Doğru eşleşmeye puan.",
  gift: "En yüksek puan: COP31 Sağlık Pavilionu hediye seti",
  location: "Sağlık Pavilionu — Etkileşim alanı",
  seconds: 75,
};

export function byIds(ids: string[]) {
  return ids.map((id) => CONCEPTS.find((c) => c.id === id)!).filter(Boolean);
}
