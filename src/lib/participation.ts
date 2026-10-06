import { COP_DATES } from "./cop-days";

/** Turns free text such as "9-10 Kasım", "9–20 November" or "9, 11 Kasım" into COP31 dates. */
export function participationDays(text: string) {
  const days = new Set<number>();
  const clean = text.replace(/[–—]/g, "-");
  for (const m of clean.matchAll(/(\d{1,2})\s*-\s*(\d{1,2})/g)) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    for (let d = Math.min(a, b); d <= Math.max(a, b); d += 1) days.add(d);
  }
  for (const m of clean.replace(/(\d{1,2})\s*-\s*(\d{1,2})/g, " ").matchAll(/\d{1,2}/g)) days.add(Number(m[0]));
  return COP_DATES.filter((date) => days.has(Number(date.slice(8, 10))));
}

/** Writes selected COP31 dates back as text that `participationDays` reads, e.g. "9–12, 18 Kasım". */
export function formatParticipationDays(dates: string[]) {
  const nums = [...new Set(dates.filter((d) => COP_DATES.includes(d)).map((d) => Number(d.slice(8, 10))))].sort((a, b) => a - b);
  if (!nums.length) return "";
  const parts: string[] = [];
  for (let i = 0; i < nums.length; ) {
    let j = i;
    while (j + 1 < nums.length && nums[j + 1] === nums[j] + 1) j += 1;
    parts.push(j > i ? `${nums[i]}–${nums[j]}` : String(nums[i]));
    i = j + 1;
  }
  return `${parts.join(", ")} Kasım`;
}
