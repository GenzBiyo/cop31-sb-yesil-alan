/** Desk pages that SB staff (SAGLIK) may not open; only the admin sees them. */
export const SB_HIDDEN_PAGES = [
  "/firmalar",
  "/hesaplar",
  "/konusmaci-yonetimi",
  "/etkinlikler",
  "/sponsorlar",
  "/oyunlar",
  "/sunucu",
  "/oyun-sponsorluk",
  "/anonslar",
  "/esantiyon",
  "/uygunluk",
];

export function sbCanSee(pathname: string) {
  const path = pathname.split(/[?#]/)[0];
  return !SB_HIDDEN_PAGES.some((p) => path === p || path.startsWith(`${p}/`));
}
