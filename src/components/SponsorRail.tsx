"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";
import { useI18n } from "@/components/I18nProvider";
import { DEFAULT_MAIN_LOGO } from "@/lib/sponsors";

type Brand = {
  mainLogo?: string;
  sponsors?: { id: string; name: string; logoPath: string; url: string }[];
};

let sponsorCache: Brand | null = null;
let sponsorAt = 0;
let sponsorPending: Promise<Brand> | null = null;

function useSponsors() {
  const [data, setData] = useState<Brand | null>(sponsorCache);
  useEffect(() => {
    let alive = true;
    if (sponsorCache && Date.now() - sponsorAt < 30000) {
      setData(sponsorCache);
      return;
    }
    if (!sponsorPending) {
      sponsorPending = api<Brand>("/api/public/sponsors")
        .then((body) => {
          sponsorCache = body;
          sponsorAt = Date.now();
          sponsorPending = null;
          return body;
        })
        .catch((err) => {
          sponsorPending = null;
          throw err;
        });
    }
    sponsorPending.then((body) => {
      if (alive) setData(body);
    }).catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  return data;
}

export function MainLogo() {
  const { tx } = useI18n();
  const data = useSponsors();
  return <img className="gate-main-logo" src={data?.mainLogo || DEFAULT_MAIN_LOGO} alt={tx("Ana logo")} decoding="async" />;
}

export function SponsorRail() {
  const { tx } = useI18n();
  const data = useSponsors();
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
    <section className="sponsor-rail" aria-label={tx("Paydaşlar")}>
      <p className="sponsor-kicker">{tx("Paydaşlar")}</p>
      <div className="sponsor-mask">
        <div className="sponsor-track" style={{ animationDuration: `${duration}s` }}>
          {loop.map((s, i) => {
            const img = (
              <span className="sponsor-tile">
                <img src={s.logoPath} alt={s.name} loading="lazy" decoding="async" />
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
