"use client";

import { useApi, formatDate } from "@/lib/client";
import { useMemo, useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import { AgendaAlerts } from "@/components/AgendaAlerts";
import { ProgramFilterBar, agendaMatchesFilter, type ProgramFilter } from "@/components/CopDayGrid";

type Day = {
  date: string;
  themeTr: string;
  topic1: string;
  agenda: { id: string; startTime: string; endTime: string; title: string; location: string; type: string; description?: string }[];
};
type Ev = {
  slug: string;
  title: string;
  type: string;
  companyName: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  gift: string;
};

const TYPE_TR: Record<string, string> = {
  "gift-qa": "Hediyeli soru-cevap",
  quiz: "Bilgi yarışması",
  survey: "Anket",
  wheel: "Dijital çark",
  interactive: "İnteraktif deneyim",
};

export default function PublicProgramPage() {
  const { tx } = useI18n();
  const [programFilter, setProgramFilter] = useState<ProgramFilter>("all");
  const { data } = useApi<{ days: Day[]; events: Ev[] }>("/api/public/program");
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const grouped = useMemo(() => {
    const map = new Map<string, { day?: Day; events: Ev[] }>();
    for (const d of data?.days || []) map.set(d.date, { day: d, events: [] });
    for (const e of data?.events || []) {
      const cur = map.get(e.date) || { events: [] };
      cur.events.push(e);
      map.set(e.date, cur);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [data]);

  return (
    <main className="min-h-screen bg-[#EEF8FD]">
      <AgendaAlerts publicMode />
      <header className="on-dark px-5 py-8 text-[#EEF8FD]" style={{ background: "#0088C8" }}>
        <p className="text-xs tracking-[0.22em] uppercase opacity-80">{tx("COP31 Türkiye · Sağlık Pavilionu")}</p>
        <h1 className="display text-4xl mt-2">{tx("Açık program")}</h1>
        <p className="text-[#C8EEFA] mt-1">{tx("9–20 Kasım 2026 · Antalya EXPO Center · Blue Zone")}</p>
        <a href="/oyun" className="inline-block mt-3 text-sm underline text-[#C8EEFA]">{tx("Etkileşim alanı / oyunlar →")}</a>
        <a href="/stant-takvimi" className="btn secondary ml-3 mt-3">{tx("Stand takvimi")}</a>
      </header>
      <div className="max-w-3xl mx-auto p-5 space-y-6">
        <ProgramFilterBar value={programFilter} onChange={setProgramFilter} />
        {grouped.map(([date, block]) => {
          const agenda = (block.day?.agenda || []).filter((item) => agendaMatchesFilter(item.type, programFilter));
          const events = programFilter === "all" || programFilter === "event" ? block.events : [];
          if (!agenda.length && !events.length) return null;
          return (
          <section key={date} className="card p-4">
            <div className="text-[#0077C2] font-semibold">{formatDate(date)}</div>
            <h2 className="display text-2xl">{tx(block.day?.themeTr || "Etkinlikler")}</h2>
            {agenda.map((a) => (
              <a key={a.id} href={`/g/${a.id}`} className="block border-b border-[#DCE8F0] py-2 text-sm hover:bg-[#F4FBFF]">
                <span className="text-[#0077C2]">{a.startTime}–{a.endTime}</span> {tx(a.title)}
                {a.description && !a.description.includes("boşluğu") ? <div className="text-sm text-[#3E6A88] mt-1 line-clamp-3">{a.description}</div> : null}
                <div className="text-xs text-[#57534e]">{tx(a.type)} · {tx(a.location)} · {a.description && !a.description.includes("boşluğu") ? tx("Özeti oku ve kayıt ol") : tx("QR ile kayıt")}</div>
              </a>
            ))}
            {events.map((e) => (
              <a key={e.slug} href={`/e/${e.slug}`} className="block mt-3 p-3 bg-[#EAF2F8] hover:bg-white">
                <div className="text-xs uppercase tracking-wide text-[#0077C2]">{tx(TYPE_TR[e.type] || e.type)}</div>
                <div className="font-semibold">{tx(e.title)}</div>
                <div className="text-xs text-[#57534e]">{tx(e.companyName)} · {tx(e.location)} · {tx("hediye:")} {tx(e.gift)}</div>
                <span className="text-sm text-[#0077C2]">{tx("Katıl / kayıt →")}</span>
              </a>
            ))}
          </section>
          );
        })}
        <p className="text-xs text-[#57534e] text-center">QR ile açıldı · {origin}/p</p>
      </div>
    </main>
  );
}
