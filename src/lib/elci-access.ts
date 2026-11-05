/** Pages an accepted ambassador can open inside the prep desk. */
export const ELCI_PAGES = [
  "/program",
  "/uygulama",
  "/konusmaci-yonetimi",
  "/katilimcilar",
  "/esantiyon",
  "/anonslar",
  "/uygunluk",
  "/elci-masa",
  "/paneller",
];

const ELCI_API = [
  "/api/auth",
  "/api/days",
  "/api/plan",
  "/api/calendar",
  "/api/calendar-joins",
  "/api/pavilion",
  "/api/speakers",
  "/api/participants",
  "/api/giveaways",
  "/api/announcements",
  "/api/inbox",
  "/api/submissions",
  "/api/stock",
  "/api/realtime",
  "/api/qr",
  "/api/pdf/program",
  "/api/panels",
];

export function elciCanOpen(pathname: string) {
  const path = pathname.split(/[?#]/)[0];
  if (path.startsWith("/api/")) return ELCI_API.some((item) => path === item || path.startsWith(`${item}/`));
  return ELCI_PAGES.some((item) => path === item || path.startsWith(`${item}/`));
}
