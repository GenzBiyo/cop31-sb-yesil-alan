export const TARGET_YEAR = 2035;
export const HEALTHY_BMI = 22.5;
/** Green band on the height–weight BMI chart (not the cyan/yellow edges). */
export const BMI_GREEN_MIN = 21;
export const BMI_GREEN_MAX = 24.9;
/** Mixed-diet food-system intensity, kg CO₂e per 1000 kcal. */
const KG_PER_1000_KCAL = 2.05;
const ACTIVITY = 1.45;

export const SAMPLE_KILO = {
  slug: "karbon-kilo",
  title: "Kilo Karbon",
  description:
    "Cinsiyet, yaş, boy ve kilonu gir. BKİ tablosuna ve 2035’e kadarki gıda karbon izine bak.",
  gift: "Bilgi: daha dengeli beden, daha düşük gıda izi",
  location: "Sağlık Pavilionu — Etkileşim alanı",
  seconds: 12,
};

export type KiloSex = "kadin" | "erkek";
export type KiloInput = { sex: KiloSex; age: number; heightCm: number; weightKg: number };

export const BMI_SCALE = [
  { id: "dusuk", upTo: 18.5, from: 15, label: "Düşük", color: "#2ec4ce" },
  { id: "ince", upTo: 21, from: 18.5, label: "İnce", color: "#7dd8c8" },
  { id: "dengeli", upTo: 25, from: 21, label: "Dengeli", color: "#43a047" },
  { id: "fazla", upTo: 30, from: 25, label: "Fazla", color: "#f4c430" },
  { id: "yuksek", upTo: 35, from: 30, label: "Yüksek", color: "#f08a1f" },
  { id: "cok", upTo: 42, from: 35, label: "Çok yüksek", color: "#e23b2e" },
] as const;

export type BmiBandId = (typeof BMI_SCALE)[number]["id"];

export type KiloResult = {
  sex: KiloSex;
  sexLabel: string;
  age: number;
  heightCm: number;
  weightKg: number;
  bmi: number;
  bmiLabel: string;
  bmiColor: string;
  bmiBand: BmiBandId;
  bmiNote: string;
  healthyMinKg: number;
  healthyMaxKg: number;
  kcalDay: number;
  kgYear: number;
  tonnesYear: number;
  years: number;
  fromYear: number;
  toYear: number;
  tonnesTo2035: number;
  kgTo2035: number;
  trees: number;
  carKm: number;
  flights: number;
  healthyWeightKg: number;
  healthyTonnesTo2035: number;
  savedTonnes: number;
  haze: number;
  airLevel: 1 | 2 | 3 | 4 | 5;
  airFill: number;
};

/**
 * 5 kademe — her hesap 5’e kilitlenmez.
 *
 *   s = 0.35 · (ton2035 − 12) / 2  +  0.65 · (BKİ − 18.5) / 3.5
 *   kademe = 1 + clamp(round(s), 0, 4)
 *   tüp    = kademe / 5
 */
export function airGrade(bmi: number, tonnesTo2035: number) {
  const carbon = (tonnesTo2035 - 12) / 2;
  const body = (bmi - 18.5) / 3.5;
  const score = 0.35 * carbon + 0.65 * body;
  const level = (1 + Math.max(0, Math.min(4, Math.round(score)))) as 1 | 2 | 3 | 4 | 5;
  return { level, fill: level / 5, score: Math.round(score * 100) / 100 };
}

export function yearsUntil2035(now = new Date()) {
  const end = Date.UTC(TARGET_YEAR + 1, 0, 1);
  return Math.max(0.15, (end - now.getTime()) / (365.25 * 86400000));
}

export function parseSex(raw: unknown): KiloSex | null {
  const s = String(raw ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  if (["kadin", "kadın", "f", "female", "woman", "k"].includes(s) || s === "kadin") return "kadin";
  if (["erkek", "m", "male", "man", "e"].includes(s)) return "erkek";
  return null;
}

export function parseKiloInput(raw: {
  sex?: unknown;
  cinsiyet?: unknown;
  age?: unknown;
  heightCm?: unknown;
  weightKg?: unknown;
}): KiloInput | null {
  const sex = parseSex(raw.sex ?? raw.cinsiyet);
  const age = Number(raw.age);
  const heightCm = Number(raw.heightCm);
  const weightKg = Number(raw.weightKg);
  if (!sex) return null;
  if (!Number.isFinite(age) || !Number.isFinite(heightCm) || !Number.isFinite(weightKg)) return null;
  if (age < 10 || age > 90) return null;
  if (heightCm < 120 || heightCm > 220) return null;
  if (weightKg < 30 || weightKg > 220) return null;
  return { sex, age: Math.round(age), heightCm: Math.round(heightCm), weightKg: Math.round(weightKg * 10) / 10 };
}

/** Mifflin–St Jeor resting kcal, then × activity. */
function bmrKcal(sex: KiloSex, age: number, heightCm: number, weightKg: number) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "kadin" ? base - 161 : base + 5;
}

function foodKgYear(kcalDay: number) {
  return (kcalDay * 365.25 * KG_PER_1000_KCAL) / 1000;
}

export function bmiBandAt(bmi: number) {
  return BMI_SCALE.find((b) => bmi < b.upTo) || BMI_SCALE[BMI_SCALE.length - 1];
}

export function bmiMarkerPct(bmi: number) {
  return Math.max(1.5, Math.min(98.5, ((bmi - 15) / (42 - 15)) * 100));
}

function roundKg(kg: number) {
  return Math.round(kg * 10) / 10;
}

function bmiNote(sex: KiloSex, bmi: number, band: ReturnType<typeof bmiBandAt>, minKg: number, maxKg: number) {
  const range = `${minKg.toLocaleString("tr-TR")}–${maxKg.toLocaleString("tr-TR")} kg`;
  const n = bmi.toLocaleString("tr-TR", { maximumFractionDigits: 1 });
  if (sex === "kadin") {
    if (band.id === "dusuk") {
      return `Kadın bedeninde BKİ ${n} mavi (düşük) bantta. Bu boy için yeşil tablo aralığı ${range}. Düşük ağırlık kemik ve hormonal dengeyi zorlayabilir; tıbbi tanı değildir.`;
    }
    if (band.id === "ince") {
      return `Kadın için BKİ ${n} camgöbeği (ince) bantta. Yeşil bant ${range}. Kadınlarda aynı BKİ’de yağ oranı genelde erkekten yüksektir; bu beklenen farktır.`;
    }
    if (band.id === "dengeli") {
      return `Kadın için BKİ ${n} yeşil bantta (21–24,9). Aynı sayıda erkekten daha yüksek yağ oranı normaldir. Gıda izi de dengeli tarafta.`;
    }
    if (band.id === "fazla") {
      return `Kadın için BKİ ${n} sarı (fazla) bantta. Yeşil tablo aralığı ${range}. Kadınlarda yağ daha çok kalça–uylukta birikir; gıda ihtiyacı ve karbon izi yeşil banda göre daha yüksek.`;
    }
    if (band.id === "yuksek") {
      return `Kadın için BKİ ${n} turuncu bantta. Yeşil aralık ${range}. Metabolik yük ve gıda karbon izi belirgin artar; pavilyon eğitim aracıdır, tanı değildir.`;
    }
    return `Kadın için BKİ ${n} kırmızı bantta. Yeşil tablo aralığı ${range}. Hem sağlık yükü hem gıda karbon izi en yüksek dilimde; tıbbi tanı değildir.`;
  }
  if (band.id === "dusuk") {
    return `Erkek bedeninde BKİ ${n} mavi (düşük) bantta. Bu boy için yeşil tablo aralığı ${range}. Kas ve enerji rezervi azalabilir; tıbbi tanı değildir.`;
  }
  if (band.id === "ince") {
    return `Erkek için BKİ ${n} camgöbeği (ince) bantta. Yeşil bant ${range}. Kas kütlesi bu aralıkta daha rahat tutulur.`;
  }
  if (band.id === "dengeli") {
    return `Erkek için BKİ ${n} yeşil bantta (21–24,9). Aynı BKİ’de erkeklerde kas payı genelde daha yüksektir. Gıda izi de dengeli tarafta.`;
  }
  if (band.id === "fazla") {
    return `Erkek için BKİ ${n} sarı (fazla) bantta. Yeşil tablo aralığı ${range}. Erkeklerde yağ daha çok bel çevresinde birikir; gıda ihtiyacı ve karbon izi yükselir.`;
  }
  if (band.id === "yuksek") {
    return `Erkek için BKİ ${n} turuncu bantta. Yeşil aralık ${range}. Bel çevresi yağ ve gıda karbon izi belirgin artar; pavilyon eğitim aracıdır, tanı değildir.`;
  }
  return `Erkek için BKİ ${n} kırmızı bantta. Yeşil tablo aralığı ${range}. Hem sağlık yükü hem gıda karbon izi en yüksek dilimde; tıbbi tanı değildir.`;
}

export function estimateCarbon(input: KiloInput, now = new Date()): KiloResult {
  const heightM = input.heightCm / 100;
  const bmi = input.weightKg / (heightM * heightM);
  const band = bmiBandAt(bmi);
  const healthyMinKg = roundKg(BMI_GREEN_MIN * heightM * heightM);
  const healthyMaxKg = roundKg(BMI_GREEN_MAX * heightM * heightM);
  const kcalDay = Math.max(1000, bmrKcal(input.sex, input.age, input.heightCm, input.weightKg) * ACTIVITY);
  const kgYear = foodKgYear(kcalDay);
  const years = yearsUntil2035(now);
  const kgTo2035 = kgYear * years;
  const healthyWeightKg = roundKg(HEALTHY_BMI * heightM * heightM);
  const useHealthy = bmi >= 25 && healthyWeightKg < input.weightKg - 1;
  const healthyKcal = Math.max(
    1000,
    bmrKcal(input.sex, input.age, input.heightCm, useHealthy ? healthyWeightKg : input.weightKg) * ACTIVITY,
  );
  const healthyKg = foodKgYear(healthyKcal) * years;
  const tonnesTo2035 = kgTo2035 / 1000;
  const grade = airGrade(bmi, tonnesTo2035);
  return {
    sex: input.sex,
    sexLabel: input.sex === "kadin" ? "Kadın" : "Erkek",
    age: input.age,
    heightCm: input.heightCm,
    weightKg: input.weightKg,
    bmi: Math.round(bmi * 10) / 10,
    bmiLabel: band.label,
    bmiColor: band.color,
    bmiBand: band.id,
    bmiNote: bmiNote(input.sex, Math.round(bmi * 10) / 10, band, healthyMinKg, healthyMaxKg),
    healthyMinKg,
    healthyMaxKg,
    kcalDay: Math.round(kcalDay),
    kgYear: Math.round(kgYear),
    tonnesYear: Math.round((kgYear / 1000) * 100) / 100,
    years: Math.round(years * 10) / 10,
    fromYear: now.getFullYear(),
    toYear: TARGET_YEAR,
    tonnesTo2035: Math.round(tonnesTo2035 * 100) / 100,
    kgTo2035: Math.round(kgTo2035),
    trees: Math.round(kgTo2035 / 21),
    carKm: Math.round(kgTo2035 / 0.17),
    flights: Math.round((kgTo2035 / 180) * 10) / 10,
    healthyWeightKg,
    healthyTonnesTo2035: Math.round((healthyKg / 1000) * 100) / 100,
    savedTonnes: useHealthy ? Math.round(((kgTo2035 - healthyKg) / 1000) * 100) / 100 : 0,
    haze: Math.max(0.12, Math.min(0.82, tonnesTo2035 / 28)),
    airLevel: grade.level,
    airFill: grade.fill,
  };
}

export function formatTonnes(t: number) {
  if (t < 1) return `${Math.round(t * 1000)} kg`;
  return `${t.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ton`;
}
