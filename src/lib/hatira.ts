export const HATIRA_FRAME = "/hatira/hatira-frame.png";
export const HATIRA_NATURE = "/hatira/hatira-nature.png";
/** Real photo: Çıralı / Olympos beach, Antalya (Wikimedia CC BY-SA). */
export const HATIRA_WASM = "/hatira/wasm";
export const HATIRA_MODEL = "/hatira/selfie_segmenter.tflite";
export const HATIRA_LOGO_COP31 = "/hatira/logo-cop31.png";
export const HATIRA_LOGO_SAGLIK = "/hatira/logo-saglik.jpg";

export const SAMPLE_HATIRA = {
  slug: "cop31-hatira",
  title: "COP31 Hatıra",
  description: "Karekodu okut, selfie çek, hazırla. COP31 Sağlık Bakanlığı hatırası duvarda görünsün.",
  gift: "Hatıran pavilion ekranında",
  location: "Sağlık Pavilionu — Etkileşim alanı",
  seconds: 8,
};

export type HatiraLogos = {
  cop31: string;
  saglik: string;
};

export function defaultHatiraLogos(): HatiraLogos {
  return { cop31: HATIRA_LOGO_COP31, saglik: HATIRA_LOGO_SAGLIK };
}

export function parseHatiraLogos(logoPath: string | null | undefined): HatiraLogos {
  const fallback = defaultHatiraLogos();
  const raw = String(logoPath || "").trim();
  if (!raw) return fallback;
  if (raw.startsWith("{")) {
    try {
      const j = JSON.parse(raw) as Partial<HatiraLogos>;
      return {
        cop31: j.cop31 || fallback.cop31,
        saglik: j.saglik || fallback.saglik,
      };
    } catch {
      return fallback;
    }
  }
  return { cop31: raw, saglik: fallback.saglik };
}

export function mergeHatiraLogos(logoPath: string | null | undefined, patch: Partial<HatiraLogos>) {
  return { ...parseHatiraLogos(logoPath), ...patch };
}

export type HatiraShot = {
  id: string;
  nickname: string;
  photoPath: string;
  createdAt: string;
};

export type HatiraPublic = {
  shots: HatiraShot[];
  pending: number;
};
