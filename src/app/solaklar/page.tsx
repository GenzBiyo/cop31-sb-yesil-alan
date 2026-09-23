"use client";

import { QrImage, usePublicOrigin } from "@/components/QrImage";
import { useApi } from "@/lib/client";
import { useMemo } from "react";
import { useI18n } from "@/components/I18nProvider";

type Ev = {
  slug: string;
  title: string;
  type: string;
  companyName: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  description: string;
  gift: string;
};

const TYPE_TR: Record<string, string> = {
  "gift-qa": "Hediyeli soru-cevap",
  quiz: "Bilgi yarışması",
  survey: "Anket",
  wheel: "Dijital çark",
  interactive: "İnteraktif yürüyüş",
};

const RULES = [
  "Pet şişe ve tek kullanımlık tabak/bardak yok — matara ve bez çanta getirin.",
  "Atık yalnızca üç kutuya ayrılır: organik, ambalaj, cam.",
  "Sağlık atığı köye sokulmaz.",
  "Üst düzey ziyaret sırasında (11 Kasım 14:00–15:20) patika açık kalır; kalabalık yol kenarında durur.",
  "Gölge ve su molası zorunlu — özellikle çocuk, yaşlı ve kronik hasta ziyaretçiler için.",
];

export default function SolaklarPage() {
  const { tx } = useI18n();
  const { data } = useApi<{ events: Ev[] }>("/api/public/program");
  const origin = usePublicOrigin();
  const byDay = useMemo(() => {
    const events = (data?.events || []).filter((e) => e.slug.startsWith("solaklar-") || e.location.includes("Solaklar"));
    return {
      d11: events.filter((e) => e.date === "2026-11-11"),
      d12: events.filter((e) => e.date === "2026-11-12"),
    };
  }, [data]);

  return (
    <main className="min-h-screen bg-[#EEF8FD]">
      <header className="px-5 py-8 text-[#EEF8FD]" style={{ background: "#22A34A" }}>
        <a href="/p" className="text-xs underline opacity-80">{tx("← Pavilion açık program")}</a>
        <p className="text-xs tracking-[0.22em] uppercase mt-3 opacity-80">{tx("COP31 Türkiye · Sağlık Pavilionu · Sıfır Atık Köyü")}</p>
        <h1 className="display text-4xl mt-2">{tx("Solaklar outdoor")}</h1>
        <p className="text-[#d7e4d8] mt-1">{tx("11–12 Kasım 2026 · Liderler Zirvesi günleri · açık hava")}</p>
      </header>
      <div className="max-w-3xl mx-auto p-5 space-y-6">
        <section className="card p-4 flex flex-wrap gap-5 items-center">
          <QrImage path="/solaklar" alt="Solaklar QR" size={120} />
          <div>
            <div className="text-xs tracking-[0.16em] uppercase text-[#22A34A]">{tx("Köy girişi karekodu")}</div>
            <p className="text-sm mt-1">{tx("Elçiler bu QR ile kayıt alır. Her durak kendi etkinlik sayfasına gider.")}</p>
            <p className="text-xs text-[#57534e] mt-1">{origin}/solaklar</p>
          </div>
        </section>

        <section className="card p-4">
          <h2 className="display text-2xl">{tx("Köy kuralları")}</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {RULES.map((r) => (
              <li key={r} className="border-b border-[#DCE8F0] pb-2">{tx(r)}</li>
            ))}
          </ul>
        </section>

        <DayBlock
          title={tx("11 Kasım — Sıfır Atık · Liderler 1. Gün")}
          subtitle={tx("Karşılama → beş durak yürüyüş → kompost → paketsiz öğle → protokol güzergâhı → ayırma oyunu → nefes yürüyüşü")}
          events={byDay.d11}
        />
        <DayBlock
          title={tx("12 Kasım — Dirençli yerleşim · Liderler 2. Gün")}
          subtitle={tx("Brifing → doğa temelli çözüm yürüyüşü → sıcaklık/su istasyonu → imece bahçe → hediye çarkı → kapanış halkası")}
          events={byDay.d12}
        />

        <p className="text-xs text-[#57534e] text-center">{tx("Tek kullanımlıksız saha")} · {origin}/solaklar</p>
      </div>
    </main>
  );
}

function DayBlock({ title, subtitle, events }: { title: string; subtitle: string; events: Ev[] }) {
  const { tx } = useI18n();
  return (
    <section className="card p-4 space-y-3">
      <div>
        <h2 className="display text-2xl">{title}</h2>
        <p className="text-sm text-[#57534e] mt-1">{subtitle}</p>
      </div>
      {events.length === 0 ? <p className="text-sm text-[#57534e]">{tx("Program yükleniyor…")}</p> : null}
      {events.map((e) => (
        <a key={e.slug} href={`/e/${e.slug}`} className="block p-3 bg-[#EAF2F8] hover:bg-white">
          <div className="text-xs uppercase tracking-wide text-[#22A34A]">
            {e.startTime}–{e.endTime} · {tx(TYPE_TR[e.type] || e.type)}
          </div>
          <div className="font-semibold">{tx(e.title)}</div>
          <div className="text-xs text-[#57534e] mt-1">{tx(e.location)}</div>
          <p className="text-sm mt-1">{tx(e.description)}</p>
          <div className="text-xs text-[#0077C2] mt-1">{tx("Hediye:")} {tx(e.gift)}</div>
          <span className="text-sm text-[#22A34A]">{tx("Katıl / kayıt →")}</span>
        </a>
      ))}
    </section>
  );
}
