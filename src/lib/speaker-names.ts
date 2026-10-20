/** Folds Turkish spelling so "Barış Özyurtlu" and "Baris OZYURTLU" count as one person. */
export function foldName(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(prof|doc|dr|uzm|phd|md)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type NamedSpeaker = {
  id: string;
  name: string;
  title: string;
  organization: string;
  photoPath?: string;
  status: string;
  active: boolean;
};

function rank(row: NamedSpeaker) {
  let score = 0;
  if (row.status === "Onaylandı") score += 8;
  if (row.photoPath) score += 4;
  if (row.title) score += 2;
  if (row.organization && foldName(row.organization) !== foldName(row.name)) score += 1;
  if (row.name !== row.name.toLocaleUpperCase("tr-TR")) score += 2;
  return score;
}

/** One row per person. Inactive and rejected speakers stay off the picker. */
export function uniqueSpeakers<T extends NamedSpeaker>(rows: T[]) {
  const ranked = rows
    .filter((row) => row.active && row.status !== "Reddedildi" && row.name.trim())
    .sort((a, b) => rank(b) - rank(a));
  const seen = new Set<string>();
  const kept: T[] = [];
  for (const row of ranked) {
    const key = foldName(row.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    kept.push(row);
  }
  return kept.sort((a, b) => a.name.localeCompare(b.name, "tr"));
}

export function speakerLabel(row: { name: string; title?: string; organization?: string }) {
  const org = row.organization && foldName(row.organization) !== foldName(row.name) ? row.organization : "";
  return [row.name, row.title, org].filter(Boolean).join(" · ");
}
