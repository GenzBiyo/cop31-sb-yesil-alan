export type NamedPerson = { name: string; title: string };

export type MeetingWish = {
  with: string;
  topic: string;
  date: string;
  timeOfDay: string;
  attendees: NamedPerson[];
};

export type MinistryMeeting = {
  wanted: string;
  unit: string;
  other: string;
  date: string;
  time: string;
  requester: string;
  topic: string;
  request: string;
  attendees: NamedPerson[];
};

export const MINISTRY_UNITS = ["SGGM", "HSGM", "KHGM", "TİTCK", "TÜSEB", "USHAŞ"];
export const OTHER_UNIT = "Diğer";
export const SLOT_TIMES = Array.from({ length: 8 }, (_, i) => `${String(9 + i).padStart(2, "0")}:00`);
export const SLOT_MINUTES = 15;

export function slotEnd(time: string) {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + SLOT_MINUTES;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function emptyMinistryMeeting(): MinistryMeeting {
  return { wanted: "", unit: "", other: "", date: "", time: "", requester: "", topic: "", request: "", attendees: [{ name: "", title: "" }] };
}

export function parseMinistryMeeting(text: string): MinistryMeeting | null {
  if (!text) return null;
  try {
    return { ...emptyMinistryMeeting(), ...(JSON.parse(text) as MinistryMeeting) };
  } catch {
    return null;
  }
}

export type StakeholderInput = {
  email: string;
  companyName: string;
  contactName: string;
  contactPhone: string;
  theme: string;
  headcount: number;
  days: string[];
  speakerWilling: boolean;
  speakers: NamedPerson[];
  presentation: boolean;
  standWanted: boolean;
  standDays: string;
  videoReady: string;
  interactive: string;
  meetingHost: string;
  meetingIncoming: string;
  meetingRequests: MeetingWish[];
  ministryMeeting: MinistryMeeting;
};

export type StakeholderRow = Omit<StakeholderInput, "ministryMeeting"> & {
  ministryMeeting: MinistryMeeting | null;
  id: string;
  source: string;
  submittedAt: string;
  updatedAt: string;
};

export const FORM_DAYS = Array.from({ length: 12 }, (_, i) => `2026-11-${String(9 + i).padStart(2, "0")}`);

export function dayLabel(date: string) {
  return `${Number(date.slice(8, 10))} Kasım`;
}

export const VIDEO_OPTIONS = ["Hazır, paylaşabilirim.", "Hazır değil ajans ile çalışacağım", "Video kullanmayacağım"];
export const INTERACTIVE_OPTIONS = [
  "Evet, içeriğimiz hazır",
  "Evet ama içerik ve planlama konusunda destek istiyorum",
  "Hayır, istemiyorum",
];
export const TIME_OF_DAY = ["Fark etmez", "Sabah", "Öğleden sonra"];
export const MINISTRY_NAME = "T.C. Sağlık Bakanlığı";

export const FORM_INTRO =
  "Sağlık Bakanlığı Pavilyonu içerisinde 3 Kamu 3 Özel Sektör Paydaşları için toplamda 6 tane stand alanı bulunmaktadır. Her stand arkasında, firmaların videolarını döndüreceği, duvara monte 45 inch ekran bulunacaktır. 15 dakikalık firma sunumları 2,5m x 2,5m ana ekran önünde yapılacaktır. Pavilyon içerisinde 3 konuşmacı + 1 moderatör ile tematik konulara uygun panel oturumları gerçekleştirilecektir.";

export function emptyInput(): StakeholderInput {
  return {
    email: "",
    companyName: "",
    contactName: "",
    contactPhone: "",
    theme: "",
    headcount: 0,
    days: [],
    speakerWilling: false,
    speakers: [],
    presentation: false,
    standWanted: false,
    standDays: "",
    videoReady: "",
    interactive: "",
    meetingHost: "",
    meetingIncoming: "",
    meetingRequests: [],
    ministryMeeting: emptyMinistryMeeting(),
  };
}

const str = (v: unknown, max = 400) => String(v ?? "").trim().slice(0, max);

function people(v: unknown, limit: number): NamedPerson[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((p) => ({ name: str(p?.name, 120), title: str(p?.title, 200) }))
    .filter((p) => p.name)
    .slice(0, limit);
}

/** Validates and trims a public submission; returns an error message instead of throwing. */
export function cleanInput(body: Record<string, unknown>): { data?: StakeholderInput; error?: string } {
  const email = str(body.email, 160).toLocaleLowerCase("tr");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Geçerli bir e-posta adresi yazın." };
  const companyName = str(body.companyName, 200);
  if (!companyName) return { error: "Firma adını yazın." };
  const theme = str(body.theme, 3000);
  if (!theme) return { error: "Ana temayı yazın." };
  const headcount = Math.max(0, Math.min(500, Math.round(Number(body.headcount) || 0)));
  if (!headcount) return { error: "Kaç kişi katılacağınızı yazın." };
  const days = Array.isArray(body.days) ? body.days.map(String).filter((d) => FORM_DAYS.includes(d)) : [];
  if (!days.length) return { error: "Katılacağınız günleri seçin." };
  const meetingHost = str(body.meetingHost, 10);
  const meetingIncoming = str(body.meetingIncoming, 10);
  if (!meetingHost || !meetingIncoming) return { error: "Toplantı sorularını yanıtlayın." };
  const requests: MeetingWish[] = Array.isArray(body.meetingRequests)
    ? body.meetingRequests
        .map((m) => ({
          with: str(m?.with, 200),
          topic: str(m?.topic, 400),
          date: FORM_DAYS.includes(String(m?.date)) ? String(m?.date) : "",
          timeOfDay: TIME_OF_DAY.includes(String(m?.timeOfDay)) ? String(m?.timeOfDay) : TIME_OF_DAY[0],
          attendees: people(m?.attendees, 15),
        }))
        .filter((m) => m.with || m.topic)
        .slice(0, 20)
    : [];
  if (meetingHost === "Evet") {
    if (!requests.length) return { error: "En az bir toplantı talebi ekleyin." };
    const bad = requests.find((m) => !m.with || !m.topic || !m.attendees.length);
    if (bad) return { error: "Her toplantı talebinde kiminle, konu ve en az bir katılımcı adı olmalı." };
  }
  const mm = (body.ministryMeeting || {}) as Record<string, unknown>;
  const ministryMeeting: MinistryMeeting = {
    wanted: str(mm.wanted, 10),
    unit: [...MINISTRY_UNITS, OTHER_UNIT].includes(String(mm.unit)) ? String(mm.unit) : "",
    other: str(mm.other, 1000),
    date: FORM_DAYS.includes(String(mm.date)) ? String(mm.date) : "",
    time: SLOT_TIMES.includes(String(mm.time)) ? String(mm.time) : "",
    requester: str(mm.requester, 120),
    topic: str(mm.topic, 300),
    request: str(mm.request, 2000),
    attendees: people(mm.attendees, 10),
  };
  if (!ministryMeeting.wanted) return { error: "Bakanlık ile 1-1 toplantı sorusunu yanıtlayın." };
  if (ministryMeeting.wanted === "Evet") {
    if (!ministryMeeting.unit) return { error: "Görüşmek istediğiniz Bakanlık birimini seçin." };
    if (ministryMeeting.unit === OTHER_UNIT && !ministryMeeting.other) return { error: "\"Diğer\" için hangi birimle görüşmek istediğinizi açıklayın." };
    if (!ministryMeeting.requester || !ministryMeeting.topic || !ministryMeeting.attendees.length)
      return { error: "Bakanlık toplantısı için talep eden, konu ve katılacak kişiyi yazın." };
  }
  if (ministryMeeting.unit === OTHER_UNIT) {
    ministryMeeting.date = "";
    ministryMeeting.time = "";
  }
  const speakerWilling = body.speakerWilling === true;
  const speakers = speakerWilling ? people(body.speakers, 10) : [];
  if (speakerWilling && !speakers.length) return { error: "Konuşmacılarınızın adını ve unvanını yazın." };
  return {
    data: {
      email,
      companyName,
      contactName: str(body.contactName, 120),
      contactPhone: str(body.contactPhone, 40),
      theme,
      headcount,
      days: FORM_DAYS.filter((d) => days.includes(d)),
      speakerWilling,
      speakers,
      presentation: body.presentation === true,
      standWanted: body.standWanted === true,
      standDays: body.standWanted === true ? str(body.standDays, 40) : "",
      videoReady: VIDEO_OPTIONS.includes(String(body.videoReady)) ? String(body.videoReady) : "",
      interactive: INTERACTIVE_OPTIONS.includes(String(body.interactive)) ? String(body.interactive) : "",
      meetingHost,
      meetingIncoming,
      meetingRequests: meetingHost === "Evet" ? requests : [],
      ministryMeeting: ministryMeeting.wanted === "Evet" ? ministryMeeting : { ...emptyMinistryMeeting(), wanted: "Hayır", attendees: [] },
    },
  };
}

type DbRow = {
  id: string;
  email: string;
  companyName: string;
  contactName: string;
  contactPhone: string;
  theme: string;
  headcount: number;
  days: string;
  speakerWilling: boolean;
  speakers: string;
  presentation: boolean;
  standWanted: boolean;
  standDays: string;
  videoReady: string;
  interactive: string;
  meetingHost: string;
  meetingIncoming: string;
  meetingRequests: string;
  ministryMeeting: string;
  source: string;
  submittedAt: Date;
  updatedAt: Date;
};

function json<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

export function toRow(r: DbRow): StakeholderRow {
  return {
    ...r,
    days: json<string[]>(r.days, []),
    speakers: json<NamedPerson[]>(r.speakers, []),
    meetingRequests: json<MeetingWish[]>(r.meetingRequests, []),
    ministryMeeting: parseMinistryMeeting(r.ministryMeeting),
    submittedAt: r.submittedAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export function toDb(d: StakeholderInput) {
  return {
    ...d,
    days: JSON.stringify(d.days),
    speakers: JSON.stringify(d.speakers),
    meetingRequests: JSON.stringify(d.meetingRequests),
    ministryMeeting: JSON.stringify(d.ministryMeeting),
  };
}
