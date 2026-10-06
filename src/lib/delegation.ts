export type Delegate = { name: string; title: string; duty: string; email: string; phone: string };

export const DELEGATE_DUTIES = [
  "Kurum temsilcisi",
  "Konuşmacı",
  "Panelist",
  "Stant sorumlusu",
  "Toplantı katılımcısı",
  "İletişim / basın",
  "Teknik ekip",
];

export const MAX_DELEGATES = 40;

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

export function cleanDelegation(v: unknown): Delegate[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((d) => ({
      name: str(d?.name, 120),
      title: str(d?.title, 160),
      duty: str(d?.duty, 120),
      email: str(d?.email, 160).toLocaleLowerCase("tr"),
      phone: str(d?.phone, 40),
    }))
    .filter((d) => d.name)
    .slice(0, MAX_DELEGATES);
}

export function parseDelegation(text: string | null | undefined): Delegate[] {
  try {
    return cleanDelegation(JSON.parse(text || "[]"));
  } catch {
    return [];
  }
}
