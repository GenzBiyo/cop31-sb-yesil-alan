"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { interpolate, isLocale, LANG_COOKIE, localeTag, setActiveLocaleTag, type Locale } from "@/lib/i18n";
import { EN } from "@/lib/i18n-phrases";
import { UI } from "@/lib/i18n-ui";

type I18nValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  tx: (text: string) => string;
  tag: string;
};

const I18nContext = createContext<I18nValue | null>(null);

function readStored(): Locale {
  if (typeof document !== "undefined") {
    const cookie = document.cookie.split("; ").find((row) => row.startsWith(`${LANG_COOKIE}=`));
    const fromCookie = cookie?.split("=")[1];
    if (isLocale(fromCookie)) return fromCookie;
  }
  if (typeof window !== "undefined") {
    const fromStore = window.localStorage.getItem(LANG_COOKIE);
    if (isLocale(fromStore)) return fromStore;
  }
  return "tr";
}

function persist(locale: Locale) {
  document.cookie = `${LANG_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
  window.localStorage.setItem(LANG_COOKIE, locale);
  document.documentElement.lang = locale;
  setActiveLocaleTag(localeTag(locale));
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("tr");

  useEffect(() => {
    const next = readStored();
    setLocaleState(next);
    persist(next);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    persist(next);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const table = UI[locale] || UI.tr;
      return interpolate(table[key] || UI.tr[key] || key, vars);
    },
    [locale],
  );

  const tx = useCallback(
    (text: string) => {
      if (!text) return text;
      if (locale === "tr") return text;
      return EN[text] || EN[text.trim()] || text;
    },
    [locale],
  );

  const value = useMemo<I18nValue>(
    () => ({ locale, setLocale, t, tx, tag: localeTag(locale) }),
    [locale, setLocale, t, tx],
  );

  return (
    <I18nContext.Provider value={value}>
      {children}
      <LangSwitch />
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return {
      locale: "tr" as Locale,
      setLocale: () => undefined,
      t: (key: string, vars?: Record<string, string | number>) => interpolate(UI.tr[key] || key, vars),
      tx: (text: string) => text,
      tag: "tr-TR",
    };
  }
  return ctx;
}

/** Translate a Turkish string in server or client trees. */
export function Tx({ children }: { children: string }) {
  const { tx } = useI18n();
  return <>{tx(children)}</>;
}

function LangSwitch() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div className="lang-switch" role="group" aria-label={t("lang.switch")}>
      {(["tr", "en"] as Locale[]).map((code) => (
        <button
          key={code}
          type="button"
          className={locale === code ? "is-on" : ""}
          onClick={() => setLocale(code)}
        >
          {code === "tr" ? t("lang.tr") : t("lang.en")}
        </button>
      ))}
    </div>
  );
}
