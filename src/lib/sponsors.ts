export type Sponsor = {
  id: string;
  name: string;
  logoPath: string;
  url: string;
  sortOrder: number;
  active: boolean;
};

export const SPONSOR_TILE = { w: 140, h: 72 } as const;
export const SPONSOR_FIT = { w: 640, h: 320 } as const;
export const MAIN_LOGO_KEY = "homeMainLogo";
export const DEFAULT_MAIN_LOGO = "/brand/cop31-turkiye.png";

export function publicLogoPath(path: string) {
  const clean = String(path || "").split("?")[0];
  return clean.startsWith("/uploads/sponsors/") || clean.startsWith("/brand/") ? clean : "";
}

export function resolveMainLogo(value?: string | null) {
  return publicLogoPath(value || "") || DEFAULT_MAIN_LOGO;
}

