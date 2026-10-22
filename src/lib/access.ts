/** Desk pages that SB staff (SAGLIK) may not open; only the admin sees them. */
export const SB_HIDDEN_PAGES = [
  "/firmalar",
  "/hesaplar",
  "/etkinlikler",
  "/sponsorlar",
  "/oyun-sponsorluk",
  "/anonslar",
  "/uygunluk",
];

export function sbCanSee(pathname: string) {
  const path = pathname.split(/[?#]/)[0];
  return !SB_HIDDEN_PAGES.some((p) => path === p || path.startsWith(`${p}/`));
}
