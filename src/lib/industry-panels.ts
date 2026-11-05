/** Pavilion industry talks from "COP31 Endüstri Konuşmaları", 5 October 2026. */
const INDUSTRY = [
  { date: "2026-11-09", start: "12:30", bit: "sanayide yesil" },
  { date: "2026-11-09", start: "14:00", bit: "yeni saglik tehdit" },
  { date: "2026-11-09", start: "15:00", bit: "iklimden nefese" },
  { date: "2026-11-10", start: "10:00", bit: "sektorunde yesil donusum" },
  { date: "2026-11-10", start: "12:00", bit: "koah" },
  { date: "2026-11-10", start: "16:00", bit: "yesil enerji" },
  { date: "2026-11-13", start: "16:00", bit: "yesil finans" },
  { date: "2026-11-14", start: "14:00", bit: "erasmus" },
  { date: "2026-11-15", start: "16:00", bit: "yenilikten etkiye" },
  { date: "2026-11-16", start: "16:00", bit: "ilac politika" },
  { date: "2026-11-18", start: "16:00", bit: "tibbi teknoloj" },
  { date: "2026-11-19", start: "11:15", bit: "is birligi" },
  { date: "2026-11-19", start: "14:00", bit: "kurumsal surdurulebilirlik" },
  { date: "2026-11-19", start: "16:00", bit: "inovasyon lider" },
];

function fold(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function isIndustryPanel(item: { date: string; startTime: string; title: string }) {
  const title = fold(item.title);
  return INDUSTRY.some((row) => row.date === item.date && row.start === item.startTime && title.includes(row.bit));
}
