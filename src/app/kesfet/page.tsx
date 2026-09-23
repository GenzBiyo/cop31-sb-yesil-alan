"use client";

import Link from "next/link";
import { useApi } from "@/lib/client";
import { MOTES } from "@/components/gate/motes";
import { useI18n } from "@/components/I18nProvider";

type Ev = {
  slug: string;
  title: string;
  date: string;
  startTime: string;
  location: string;
  gift: string;
};

export default function KesfetPage() {
  const { tx } = useI18n();
  const { data } = useApi<{ events: Ev[] }>("/api/public/program");
  const events = (data?.events || []).slice(0, 8);

  return (
    <main className="gate-root is-open" style={{ height: "auto", minHeight: "100dvh", overflow: "auto" }}>
      <div className="gate-kenburns" />
      <div className="gate-aurora" />
      <div className="gate-vignette" />
      {MOTES.map((m, i) => (
        <span
          key={i}
          className="gate-mote"
          style={{
            left: m.left,
            width: m.size,
            height: m.size,
            animationDelay: m.delay,
            animationDuration: m.duration,
          }}
        />
      ))}
      <div className="relative z-10 max-w-5xl mx-auto px-5 py-10">
        <Link href="/" className="text-xs tracking-[0.2em] uppercase opacity-80 underline underline-offset-4">{tx("← Kapılara dön")}</Link>
        <p className="gate-kicker mt-8">{tx("Misafir · hesap yok")}</p>
        <h1 className="gate-slogan text-left">
          {tx("Gezegeni dinle")}
          <br />
          <em>{tx("programı aç")}</em>
        </h1>
        <p className="gate-lead text-left mx-0">
          {tx("Giriş yapmadan açık program, Solaklar sıfır atık köyü ve hediyeli pavilon etkinlikleri. Karbon, hava ve beden aynı hikâye — koruyucu sağlık burada sahaya iner.")}
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3 mt-10">
          {[
            { href: "/p", title: "Açık program", body: "9–20 Kasım tematik günler, paneller ve kayıtlı etkinlikler.", img: "/gate/gate-hero-earth.webp" },
            { href: "/solaklar", title: "Solaklar outdoor", body: "11–12 Kasım sıfır atık köyü. Matara, kompost, lider güzergâhı.", img: "/gate/gate-elciler.webp" },
            { href: "/oyun", title: "Etkileşim alanı", body: "Duvar ekranı, karekod, rumuz. Admin onaylayınca oyuncu olursun.", img: "/gate/gate-startup.webp" },
            { href: "/giris/elciler", title: "Elçi olmak", body: "Öğrenciyseniz gönüllü kapısından başvurun.", img: "/gate/gate-misafir.webp" },
          ].map((c) => (
            <Link key={c.href} href={c.href} className="relative min-h-[240px] overflow-hidden border border-[rgba(217,208,193,0.2)]" style={{ textDecoration: "none" }}>
              <img src={c.img} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(7,9,12,0.92), rgba(7,9,12,0.2))" }} />
              <div className="relative z-10 h-full flex flex-col justify-end p-4">
                <h2 className="display text-3xl">{tx(c.title)}</h2>
                <p className="text-sm text-[#C8EEFA] mt-1">{tx(c.body)}</p>
              </div>
            </Link>
          ))}
        </div>

        <section className="mt-10">
          <h2 className="display text-3xl">{tx("Şimdi açık etkinlikler")}</h2>
          <div className="grid md:grid-cols-2 gap-2 mt-3">
            {events.map((e) => (
              <Link key={e.slug} href={`/e/${e.slug}`} className="block p-4" style={{ background: "rgba(255,253,248,0.08)", border: "1px solid rgba(217,208,193,0.16)", textDecoration: "none" }}>
                <div className="text-xs tracking-[0.14em] uppercase text-[#C8EEFA]">{e.date} · {e.startTime}</div>
                <div className="display text-2xl mt-1">{tx(e.title)}</div>
                <div className="text-sm text-[#C8EEFA] mt-1">{tx(e.location)} · {tx(e.gift)}</div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
