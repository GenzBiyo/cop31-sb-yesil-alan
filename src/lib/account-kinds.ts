/** Special (approved) account types. All of them log in with the FIRMA role and own a Company record. */
export const ACCOUNT_KINDS = [
  { id: "firma", label: "Firma", orgLabel: "Kurum adı", contact: "Firma yetkilisi", firmTools: true },
  { id: "startup", label: "Startup", orgLabel: "Startup adı", contact: "Startup yetkilisi", firmTools: true },
  { id: "kamu", label: "Kamu kurumu", orgLabel: "Kurum adı", contact: "Kurum temsilcisi", firmTools: false },
  { id: "konusmaci", label: "Konuşmacı", orgLabel: "Kurum / bağlı olduğunuz kuruluş", contact: "Konuşmacı", firmTools: false },
  { id: "stk", label: "STK / Uluslararası kuruluş", orgLabel: "Kuruluş adı", contact: "Kuruluş temsilcisi", firmTools: false },
  { id: "akademi", label: "Akademi / Üniversite", orgLabel: "Üniversite / kurum adı", contact: "Akademisyen", firmTools: false },
] as const;

export type AccountKind = (typeof ACCOUNT_KINDS)[number]["id"];

export function accountKind(id?: string | null) {
  return ACCOUNT_KINDS.find((k) => k.id === id) || ACCOUNT_KINDS[0];
}

export function validKind(id: unknown): AccountKind {
  return accountKind(String(id || "")).id;
}

export const ACCOUNT_STATUSES = ["Beklemede", "Onaylandı", "Reddedildi", "Askıda"] as const;
