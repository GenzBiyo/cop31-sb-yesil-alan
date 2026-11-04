export const KIOSK_QUERY =
  "(orientation: portrait) and (min-width: 700px) and (min-height: 1000px), (orientation: landscape) and (pointer: coarse) and (min-width: 1100px) and (max-height: 1200px)";

export function kioskMatch() {
  if (typeof window === "undefined") return false;
  const here = window.location.pathname === "/kiosk" || window.matchMedia(KIOSK_QUERY).matches;
  if (here) sessionStorage.setItem("cop31-kiosk", "1");
  return here || sessionStorage.getItem("cop31-kiosk") === "1";
}
