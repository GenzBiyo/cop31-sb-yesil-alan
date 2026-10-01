"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useApi } from "@/lib/client";
import { useI18n } from "@/components/I18nProvider";

export type PublicSpeaker = {
  id: string;
  name: string;
  title: string;
  organization: string;
  summary: string;
  bio: string;
  linkedin: string;
  photoPath: string;
};

function initials(name: string) {
  const words = name.replace(/(Prof|Doç|Dr|Uzm)\.\s*/gi, "").split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] || "") + (words.length > 1 ? words[words.length - 1][0] : "")).toLocaleUpperCase("tr-TR");
}

export function SpeakerAvatar({ name, photoPath, size }: { name: string; photoPath: string; size: number }) {
  return photoPath ? (
    <img className="speaker-avatar" src={photoPath} alt={name} width={size} height={size} style={{ width: size, height: size }} />
  ) : (
    <span className="speaker-avatar is-initials" style={{ width: size, height: size, fontSize: size * 0.36 }} aria-label={name}>
      {initials(name)}
    </span>
  );
}

export function useSpeakers() {
  return useApi<{ speakers: PublicSpeaker[] }>("/api/public/speakers");
}

export function SpeakerRail() {
  const { tx } = useI18n();
  const { data } = useSpeakers();
  const items = useMemo(() => data?.speakers || [], [data]);
  const loop = useMemo(() => {
    if (!items.length) return [];
    const base = [] as PublicSpeaker[];
    while (base.length < 10) base.push(...items);
    return [...base, ...base];
  }, [items]);
  if (!items.length) return null;

  return (
    <section className="speaker-rail" aria-label={tx("Konuşmacılar")}>
      <Link href="/konusmacilar" className="speaker-rail-kicker">{tx("Konuşmacılar")} →</Link>
      <div className="speaker-mask">
        <div className="speaker-track" style={{ animationDuration: `${Math.max(30, items.length * 6)}s` }}>
          {loop.map((s, i) => (
            <Link key={`${s.id}-${i}`} href={`/konusmacilar#${s.id}`} className="speaker-chip" title={s.name}>
              <SpeakerAvatar name={s.name} photoPath={s.photoPath} size={44} />
              <span>
                <strong>{s.name}</strong>
                <em>{s.organization || s.title}</em>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
