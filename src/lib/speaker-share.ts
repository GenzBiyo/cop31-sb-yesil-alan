export const SPEAKER_CARD_TAGS = "#COP31SaglikBakanligi #SaglikliInsanSaglikliGezegen #COP31Antalya";

export type SpeakerSession = {
  id: string;
  title: string;
  kind: string;
  role: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  talkTitle: string;
  when: string;
  lead: string;
  headline: string;
};

export type SpeakerShare = {
  id: string;
  name: string;
  title: string;
  organization: string;
  photoPath: string;
  sessions: SpeakerSession[];
};

export function speakerSharePath(id: string) {
  return `/konusmacilar/${id}`;
}

export function speakerCardFileName(name: string) {
  const map: Record<string, string> = {
    ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u",
    Ç: "c", Ğ: "g", İ: "i", Ö: "o", Ş: "s", Ü: "u",
  };
  const ascii = name.replace(/[çğıöşüÇĞİÖŞÜ]/g, (ch) => map[ch] || ch);
  const slug = ascii.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  return `COP31-Konusuyorum${slug ? `-${slug}` : ""}.jpg`;
}

export function speakerShareCaption(name: string, session?: SpeakerSession | null, locale: "tr" | "en" = "tr") {
  const who = name.trim() || (locale === "en" ? "Speaker" : "Konuşmacı");
  if (locale === "en") {
    if (!session) return `${who} is speaking at the COP31 Türkiye Ministry of Health Pavilion.\n${SPEAKER_CARD_TAGS}`;
    const where = session.headline === "Moderatörüm" ? "is moderating" : "is speaking in";
    return `${who} ${where} “${session.title}” at the COP31 Health Pavilion.\n${session.when}\n${SPEAKER_CARD_TAGS}`;
  }
  if (!session) {
    return `${who}, COP31 Türkiye Sağlık Bakanlığı Sağlık Pavyonu'nda konuşuyor.\n${SPEAKER_CARD_TAGS}`;
  }
  const where = session.headline === "Moderatörüm" ? "oturumunu yönetiyor" : "oturumunda konuşuyor";
  return `${who}, COP31 Sağlık Pavyonu'nda “${session.title}” ${where}.\n${session.when}\n${SPEAKER_CARD_TAGS}`;
}

export function formatSessionWhen(date: string, startTime: string, endTime: string) {
  const parsed = new Date(`${date}T12:00:00`);
  const day = Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
  const clock = [startTime, endTime].filter(Boolean).join("–");
  return [day, clock].filter(Boolean).join(" · ");
}

