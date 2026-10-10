"use client";

import { StandCalendar } from "@/components/StandCalendar";
import { useI18n } from "@/components/I18nProvider";

export default function StandCalendarPage() {
  const { tx } = useI18n();
  return (
    <main className="min-h-screen bg-[#EEF8FD]">
      <header className="on-dark px-5 py-8 text-[#EEF8FD]" style={{ background: "#0088C8" }}>
        <p className="text-xs tracking-[0.22em] uppercase opacity-80">{tx("COP31 Türkiye · Sağlık Pavilionu")}</p>
        <h1 className="display text-4xl mt-2">{tx("Stand takvimi")}</h1>
        <p className="text-[#C8EEFA] mt-1">{tx("9–20 Kasım 2026 · Antalya EXPO Center · Blue Zone")}</p>
        <p className="text-[#C8EEFA] mt-1">09:00–12:00 · 12:00–15:00 · 15:00–18:00</p>
        <a href="/u" className="inline-block mt-3 mr-4 text-sm underline text-[#C8EEFA]">{tx("Uygulamaya dön")}</a>
        <a href="/p" className="inline-block mt-3 text-sm underline text-[#C8EEFA]">{tx("Gündeme dön")}</a>
      </header>
      <div className="max-w-5xl mx-auto p-4 sm:p-5">
        <StandCalendar />
      </div>
    </main>
  );
}
