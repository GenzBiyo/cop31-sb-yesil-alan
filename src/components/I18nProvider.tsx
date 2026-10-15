"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { interpolate, isLocale, LANG_COOKIE, localeTag, setActiveLocaleTag, type Locale } from "@/lib/i18n";
import { UI } from "@/lib/i18n-ui";

/** Labels that repeat inside programme notes written in Turkish. */
const GLOSS: [string, string][] = [
  ["Yeşil beceriler; mükemmeliyet merkezi; yeşil satın alma; gençlerin sözü", "Green skills; a centre of excellence; green procurement; young people’s voice"],
  ["Tütünün çevresel yükü; izmarit; dumansız çevre", "The environmental burden of tobacco; cigarette butts; a smoke-free environment"],
  ["İş sağlığı; ısı stresi; çalışan sağlığı gözetimi; kamu-özel iş birliği", "Occupational health; heat stress; worker health surveillance; public–private cooperation"],
  ["Ağız ve diş sağlığında yeşil yönetişim; iklim duyarlı insan kaynağı", "Green governance in oral and dental health; a climate-aware workforce"],
  ["6 Şubat deneyimi; psikososyal dayanıklılık; afetlerde gençler", "The 6 February experience; psychosocial resilience; young people in disasters"],
  ["Hastane dekarbonizasyonu; pilot uygulama; DE-CARE modeli", "Hospital decarbonisation; a pilot; the DE-CARE model"],
  ["Gençlik; iklime hazır üniversite; bilim iletişimi", "Youth; a climate-ready university; science communication"],
  ["Hastane yemeklerinde gıda atığı; hemşirelik hizmetlerinde atık yönetimi", "Food waste in hospital meals; waste management in nursing services"],
  ["Kadın, iklim ve sağlık; kırsal dayanıklılık; kooperatifler", "Women, climate and health; rural resilience; cooperatives"],
  ["Yeşil doğumhane; sarf malzemesi karbon ayak izi; kaynağında ayrıştırma", "A green maternity ward; the carbon footprint of consumables; sorting at source"],
  ["İklim değişikliği ve sağlık; sağlık eğitimi; gençlik; iklim uyumu; sağlık iş gücünün iklim dirençliliği", "Climate change and health; health education; youth; climate adaptation; a climate-resilient health workforce"],
  ["Halk Sağlığı Genel Müdürlüğü (HSGM)", "General Directorate of Public Health (HSGM)"],
  ["Kamu Hastaneleri Genel Müdürlüğü (KHGM)", "General Directorate of Public Hospitals (KHGM)"],
  ["Enerji ve Tabii Kaynaklar Bakanlığı", "Ministry of Energy and Natural Resources"],
  ["Millî Eğitim Bakanlığı", "Ministry of National Education"],
  ["Dünya Sağlık Örgütü (DSÖ)", "World Health Organization (WHO)"],
  ["Türkiye Sağlık Enstitüleri Başkanlığı (TÜSEB)", "Health Institutes of Türkiye (TÜSEB)"],
  ["Sağlık Bakanlığı", "Ministry of Health"],
  ["Saat daha sonra girilecek.", "The time will be entered later."],
  ["İçerik bekleniyor", "Content to follow"],
  ["Teyit bekliyor", "Awaiting confirmation"],
  ["Düzenleyen:", "Organised by:"],
  ["Moderatör:", "Moderator:"],
  ["Konuşmacılar:", "Speakers:"],
  ["Süre:", "Duration:"],
  ["Sunucu:", "Host:"],
  [" dakika", " minutes"],
  ["Planlandı", "Scheduled"],
];

function gloss(text: string) {
  let next = text;
  for (const [from, to] of GLOSS) next = next.split(from).join(to);
  return next === text ? text : next;
}

type I18nValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  tx: (text: string) => string;
  tag: string;
};

const I18nContext = createContext<I18nValue | null>(null);

let dictionary: Record<string, string> | null = null;
let dictionaryLoad: Promise<void> | null = null;

function loadDictionary() {
  if (dictionary || dictionaryLoad) return dictionaryLoad;
  dictionaryLoad = import("@/lib/i18n-dict").then((mod) => {
    dictionary = mod.EN;
  });
  return dictionaryLoad;
}

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
  const [dictReady, setDictReady] = useState(false);

  const armEnglish = useCallback(() => {
    if (dictionary) {
      setDictReady(true);
      return;
    }
    void loadDictionary()?.then(() => setDictReady(true));
  }, []);

  useEffect(() => {
    const next = readStored();
    setLocaleState(next);
    persist(next);
    if (next === "en") armEnglish();
  }, [armEnglish]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    persist(next);
    if (next === "en") armEnglish();
  }, [armEnglish]);

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
      if (locale === "tr" || !dictionary) return text;
      const compact = text.replace(/\s+/g, " ").trim();
      return dictionary[text] || dictionary[text.trim()] || dictionary[compact] || gloss(text);
    },
    [locale, dictReady],
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
