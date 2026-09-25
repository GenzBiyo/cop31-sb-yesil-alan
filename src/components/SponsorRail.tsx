"use client";

import { useMemo } from "react";
import { useApi } from "@/lib/client";
import { useI18n } from "@/components/I18nProvider";
import { DEFAULT_MAIN_LOGO } from "@/lib/sponsors";

type Brand = {
  mainLogo?: string;
  sponsors?: { id: string; name: string; logoPath: string; url: string }[];
};

export function MainLogo() {
  const { tx } = useI18n();
  const { data } = useApi<Brand>("/api/public/sponsors");
  return <img className="gate-main-logo" src={data?.mainLogo || DEFAULT_MAIN_LOGO} alt={tx("Ana logo")} />;
}

export function SponsorRail() {
  const { tx } = useI18n();
  const { data } = useApi<Brand>("/api/public/sponsors");
  const items = data?.sponsors || [];
  const loop = useMemo(() => {
    if (!items.length) return [];
    const base = [] as typeof items;
    while (base.length < 8) base.push(...items);
    return [...base, ...base];
  }, [items]);
  if (!items.length) return null;
  const duration = Math.max(22, items.length * 7);

  return (
    <section className="sponsor-rail" aria-label={tx("Etkinlik sponsorları")}>
      <p className="sponsor-kicker">{tx("Etkinlik sponsorları")}</p>
      <div className="sponsor-mask">
        <div className="sponsor-track" style={{ animationDuration: `${duration}s` }}>
          {loop.map((s, i) => {
            const img = (
              <span className="sponsor-tile">
                <img src={s.logoPath} alt={s.name} />
              </span>
            );
            return s.url ? (
              <a key={`${s.id}-${i}`} href={s.url} target="_blank" rel="noreferrer" className="sponsor-link" title={s.name}>
                {img}
              </a>
            ) : (
              <span key={`${s.id}-${i}`} title={s.name}>
                {img}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}
