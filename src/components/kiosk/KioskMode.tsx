"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { kioskMatch } from "@/lib/kiosk";

const STAFF = [
  "/program",
  "/elciler",
  "/kartlar",
  "/afis",
  "/oyunlar",
  "/firmalar",
  "/todos",
  "/takvim",
  "/uygulama",
  "/hesaplar",
  "/paneller",
  "/sunumlar",
  "/konusmaci-yonetimi",
  "/etkinlikler",
  "/sponsorlar",
  "/katilimcilar",
  "/mesajlar",
  "/anonslar",
  "/dokumanlar",
  "/esantiyon",
  "/uygunluk",
  "/paydas-yanitlari",
  "/toplantilar",
  "/takvimim",
  "/profil",
  "/dashboard",
  "/sunucu",
  "/oyun-sponsorluk",
  "/alan-plani",
  "/kurallar",
  "/soru-cevap",
];

function staffPath(pathname: string) {
  return STAFF.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function useKiosk() {
  const pathname = usePathname() || "/";
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(!staffPath(pathname) && kioskMatch());
  }, [pathname]);
  return on;
}

export function KioskMode() {
  const pathname = usePathname() || "/";

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia(
      "(orientation: portrait) and (min-width: 700px) and (min-height: 1000px), (orientation: landscape) and (pointer: coarse) and (min-width: 1100px) and (max-height: 1200px)",
    );
    const apply = () => {
      if (staffPath(window.location.pathname)) {
        sessionStorage.removeItem("cop31-kiosk");
        root.classList.remove("is-kiosk");
        return;
      }
      root.classList.toggle("is-kiosk", kioskMatch());
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [pathname]);

  useEffect(() => {
    if (!document.documentElement.classList.contains("is-kiosk")) return;
    let idle = 0;
    const arm = () => {
      window.clearTimeout(idle);
      idle = window.setTimeout(() => {
        if (window.location.pathname !== "/kiosk") window.location.assign("/kiosk");
      }, 120000);
    };
    const onPointer = () => arm();
    arm();
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onPointer);
    const blockMenu = (event: Event) => event.preventDefault();
    window.addEventListener("contextmenu", blockMenu);
    const goHome = (event: MouseEvent) => {
      const link = (event.target as HTMLElement | null)?.closest("a");
      if (!link) return;
      const url = new URL(link.href, window.location.origin);
      if (url.origin === window.location.origin && url.pathname === "/") {
        event.preventDefault();
        window.location.assign("/kiosk");
      }
    };
    document.addEventListener("click", goHome);
    const open = () => {
      if (document.fullscreenElement) return;
      document.documentElement.requestFullscreen?.().catch(() => undefined);
      window.removeEventListener("pointerdown", open);
    };
    window.addEventListener("pointerdown", open);
    return () => {
      window.clearTimeout(idle);
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onPointer);
      window.removeEventListener("contextmenu", blockMenu);
      document.removeEventListener("click", goHome);
      window.removeEventListener("pointerdown", open);
    };
  }, [pathname]);

  return null;
}
