export type Locale = "tr" | "en";

export const LANG_COOKIE = "cop31_lang";
export const LOCALES: Locale[] = ["tr", "en"];

export function isLocale(v: unknown): v is Locale {
  return v === "tr" || v === "en";
}

export function localeTag(locale: Locale) {
  return locale === "en" ? "en-GB" : "tr-TR";
}

export function interpolate(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? `{${key}}`));
}

let activeTag = "tr-TR";

export function setActiveLocaleTag(tag: string) {
  activeTag = tag;
}

export function activeLocaleTag() {
  return activeTag;
}
