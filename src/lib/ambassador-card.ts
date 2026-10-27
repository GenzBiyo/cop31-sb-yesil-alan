export const AMBASSADOR_ACCEPTED = new Set(["Kabul edildi", "Yerleştirildi"]);

export const CARD_TAGS = "#COP31SaglikBakanligi #SaglikliInsanSaglikliGezegen #IklimSaglikElcisi";

export function isAmbassadorAccepted(status: string) {
  return AMBASSADOR_ACCEPTED.has(status);
}

export function ambassadorCardPath(id: string) {
  return `/elci/kart/${id}`;
}

export function ambassadorCardUrl(id: string) {
  const base = (process.env.PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://cop31saglik.com").replace(/\/$/, "");
  return `${base}${ambassadorCardPath(id)}`;
}

export function cardShareCaption(name: string) {
  const who = name.trim() || "Ben";
  return `${who}, COP31 Türkiye Sağlık Bakanlığı İklim Sağlık Elçisi olarak kabul edildi.\n${CARD_TAGS}`;
}

export function cardFileName(name: string) {
  const map: Record<string, string> = {
    ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u",
    Ç: "c", Ğ: "g", İ: "i", Ö: "o", Ş: "s", Ü: "u",
  };
  const ascii = name.replace(/[çğıöşüÇĞİÖŞÜ]/g, (ch) => map[ch] || ch);
  const slug = ascii.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  return `COP31-Iklim-Saglik-Elcisi${slug ? `-${slug}` : ""}.jpg`;
}
