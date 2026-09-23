"use client";

import Link from "next/link";
import { QrImage, usePublicOrigin } from "@/components/QrImage";
import { useApi } from "@/lib/client";
import { useI18n } from "@/components/I18nProvider";

type GameCard = {
  slug: string;
  title: string;
  description: string;
  gift: string;
  location: string;
  status: string;
  type: string;
  _count: { players: number; questions: number; slices?: number };
};

const STATUS: Record<string, string> = {
  lobby: "Lobi açık — rumuz seç",
  live: "Oynanıyor",
  closed: "Bitti — sıralama",
};

export default function GamesHubPage() {
  const { tx, t } = useI18n();
  const { data, error, loading, reload } = useApi<{ games: GameCard[] }>("/api/public/games");
  const origin = usePublicOrigin();
  const games = data?.games || [];

  return (
    <main className="min-h-screen bg-[#EEF8FD]">
      <header className="px-5 py-8 text-[#EEF8FD]" style={{ background: "#0088C8" }}>
        <a href="/" className="text-xs underline opacity-80">{tx("← Kapılara dön")}</a>
        <p className="text-xs tracking-[0.22em] uppercase mt-3 opacity-80">{tx("COP31 Türkiye · Sağlık Pavilionu")}</p>
        <h1 className="display text-4xl mt-2">{tx("Etkileşim alanı")}</h1>
        <p className="text-[#C8EEFA] mt-1">{tx("Her oyunun duvar ekranı ayrıdır. Karekodu okutunca rumuz giriş sayfası açılır.")}</p>
      </header>
      <div className="max-w-3xl mx-auto p-5 space-y-5">
        <section className="card p-4 flex flex-wrap gap-5 items-center">
          <QrImage path="/oyun" alt="Etkileşim alanı QR" size={132} />
          <div>
            <div className="text-xs tracking-[0.16em] uppercase text-[#0077C2]">{tx("Alan girişi karekodu")}</div>
            <p className="text-sm mt-1">{tx("Ziyaretçi bu kodu okutunca açık oyunlara düşer. Yeni soru-cevaplar da burada görünür.")}</p>
            <p className="text-xs text-[#57534e] mt-1">{origin}/oyun</p>
          </div>
        </section>
        {loading && !data ? <p className="text-sm text-[#57534e]">{tx("Oyunlar yükleniyor…")}</p> : null}
        {error && !data ? (
          <div className="card p-4 space-y-2">
            <p className="text-sm text-[#0077C2]">{tx(error)}</p>
            <button className="btn" type="button" onClick={() => void reload()}>{tx("Yeniden dene")}</button>
          </div>
        ) : null}
        {!loading && !error && games.length === 0 ? <p className="text-sm text-[#57534e]">{tx("Şu an açık oyun yok.")}</p> : null}
        {games.map((g) => (
          <Link key={g.slug} href={`/oyun/${g.slug}`} className="card p-4 flex flex-wrap gap-5 items-center" style={{ textDecoration: "none" }}>
            <QrImage path={`/oyun/${g.slug}/katil`} alt={`${g.title} katıl QR`} size={112} />
            <div className="flex-1 min-w-[200px]">
              <span className={`badge ${g.status === "live" ? "ok" : g.status === "closed" ? "muted" : "warn"}`}>
                {tx(STATUS[g.status] || g.status)}
              </span>
              <h2 className="display text-3xl mt-2">{tx(g.title)}</h2>
              <p className="text-sm mt-1">{tx(g.description)}</p>
              <p className="text-xs text-[#57534e] mt-2">
                {tx("Duvar ekranı")} · {g.type === "wheel" ? t("common.slices", { n: g._count.slices || 0 }) : g.type === "match" ? tx("hafıza + eşleştirme") : g.type === "kilo" ? tx("yaş · boy · kilo") : g.type === "hatira" ? tx("hatıra selfie") : t("common.questions", { n: g._count.questions })} · {tx(g.location)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
