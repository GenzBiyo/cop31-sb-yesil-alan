import { THEME_TR } from "./constants";
import { activeLocaleTag } from "./i18n";

export const COP_DATES = Object.keys(THEME_TR).sort();

export function copDayMeta(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return {
    date: iso,
    day: d.getDate(),
    weekday: d.toLocaleDateString(activeLocaleTag(), { weekday: "long" }),
    weekdayShort: d.toLocaleDateString(activeLocaleTag(), { weekday: "short" }),
    theme: THEME_TR[iso] || "",
    label: d.toLocaleDateString(activeLocaleTag(), { day: "numeric", month: "long" }),
  };
}

export const COP_DAY_OPTIONS = COP_DATES.map((date) => {
  const meta = copDayMeta(date);
  return { date, label: `${meta.day} Kasım · ${meta.theme}` };
});
