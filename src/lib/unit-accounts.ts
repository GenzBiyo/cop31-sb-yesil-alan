/** Ministry units that use a paydaş-style desk and only see their own meetings and messages. */
export const UNIT_ACCOUNTS = [
  { email: "sggm@cop31.tr", unit: "SGGM", title: "Sağlığın Geliştirilmesi Genel Müdürlüğü" },
  { email: "shgm@cop31.tr", unit: "SHGM", title: "Sağlık Hizmetleri Genel Müdürlüğü" },
  { email: "khgm@cop31.tr", unit: "KHGM", title: "Kamu Hastaneleri Genel Müdürlüğü" },
  { email: "titck@cop31.tr", unit: "TİTCK", title: "Türkiye İlaç ve Tıbbi Cihaz Kurumu" },
  { email: "tuseb@cop31.tr", unit: "TÜSEB", title: "Türkiye Sağlık Enstitüleri Başkanlığı" },
  { email: "ushas@cop31.tr", unit: "USHAŞ", title: "Uluslararası Sağlık Hizmetleri A.Ş." },
] as const;

const UNIT_PATHS = ["/profil", "/program", "/paydas-yanitlari", "/toplantilar", "/oyunlar", "/mesajlar", "/sunucu"];

const UNIT_API = [
  "/api/auth",
  "/api/days",
  "/api/plan",
  "/api/calendar",
  "/api/calendar-joins",
  "/api/pdf/program",
  "/api/stakeholders",
  "/api/ministry-slots",
  "/api/meetings",
  "/api/messages",
  "/api/games",
  "/api/qr",
  "/api/realtime",
];

export function unitOfEmail(email?: string | null) {
  const key = String(email || "").trim().toLowerCase();
  return UNIT_ACCOUNTS.find((row) => row.email === key)?.unit || "";
}

export function unitTitle(unit: string) {
  return UNIT_ACCOUNTS.find((row) => row.unit === unit)?.title || unit;
}

export function unitCanOpen(pathname: string) {
  const path = pathname.split(/[?#]/)[0];
  if (path.startsWith("/api/")) return UNIT_API.some((p) => path === p || path.startsWith(`${p}/`));
  return UNIT_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}
