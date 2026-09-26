"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MOTES } from "@/components/gate/motes";
import { MainLogo, SponsorRail } from "@/components/SponsorRail";
import { useI18n } from "@/components/I18nProvider";

const GATES = [
  {
    href: "/giris/bakanlik",
    src: "/gate/gate-bakanlik.webp",
    kicker: "01 · Bakanlık",
    title: "Sağlık Bakanlığı",
    body: "Koruyucu ve önleyici halk sağlığı. İklim krizinin solunum, salgın ve sıcaklık yükünü yöneten SGGM masası.",
  },
  {
    href: "/giris/firmalar",
    src: "/gate/gate-firmalar.webp",
    kicker: "02 · Paydaş",
    title: "Firmalar",
    body: "Yeşil üretim, düşük karbonlu ilaç ve pavilon katkısı. Hesap açın; onay sonrası masaya girin.",
  },
  {
    href: "/giris/startuplar",
    src: "/gate/gate-startup.webp",
    kicker: "03 · Yenilik",
    title: "Startuplar",
    body: "Sağlık teknolojisi, sıfır atık ve gençlik demosu. İklim-sağlık çözümünü sahaya taşıyın.",
  },
  {
    href: "/giris/elciler",
    src: "/gate/gate-elciler.webp",
    kicker: "04 · Öğrenci",
    title: "Sağlık ve İklim Elçileri",
    body: "Üniversite ve lise gönüllüleri. Karşılama, Solaklar outdoor ve ziyaretçi kaydı.",
  },
  {
    href: "/oyun",
    src: "/gate/gate-startup.webp",
    kicker: "05 · Etkileşim",
    title: "Oyun alanı",
    body: "Duvara yansıtılan yarışmalar. Karekod, rumuz, 15 saniyelik soru-cevap.",
    guest: true,
  },
  {
    href: "/kesfet",
    src: "/gate/gate-misafir.webp",
    kicker: "06 · Açık alan",
    title: "Giriş yapmadan devam et",
    body: "Açık program, Solaklar köyü, QR etkinlikler. Hesap gerekmez.",
    guest: true,
  },
];

export default function HomePage() {
  const { tx } = useI18n();
  const [inApp, setInApp] = useState(false);
  const [next, setNext] = useState<string | null>(null);
  const [qrSrc, setQrSrc] = useState("/api/qr?path=%2Fu");

  useEffect(() => {
    const n = new URLSearchParams(window.location.search).get("next");
    if (n && n.startsWith("/")) setNext(n);
    const origin = window.location.origin;
    const local = /localhost|127\.0\.0\.1/i.test(origin);
    setQrSrc(`/api/qr?path=${encodeURIComponent("/u")}${local ? "" : `&origin=${encodeURIComponent(origin)}`}`);
    fetch("/api/auth/me")
      .then((r) => {
        if (r.ok) {
          setInApp(true);
          if (n && n.startsWith("/")) window.location.replace(n);
        }
      })
      .catch(() => undefined);
  }, []);

  function href(path: string, guest?: boolean) {
    if (guest || !next) return path;
    return `${path}?next=${encodeURIComponent(next)}`;
  }

  return (
    <main className="gate-root climate-root is-open">
      <SponsorRail />
      <div className="climate-scene" aria-hidden>
        <div className="climate-sky" />
        <div className="climate-heat" />
        <div className="climate-lung climate-lung-l" />
        <div className="climate-lung climate-lung-r" />
        <div className="climate-earth">
          <img src="/gate/gate-hero-earth.webp" alt="" />
        </div>
        <span className="climate-ring" />
        <span className="climate-ring climate-ring-2" />
        <span className="climate-ring climate-ring-3" />
        <svg className="climate-ecg" viewBox="0 0 800 90" preserveAspectRatio="none">
          <path d="M0 52 H90 L108 52 L124 18 L142 78 L158 52 H250 L268 52 L286 8 L308 84 L328 52 H430 L448 52 L464 22 L482 74 L498 52 H800" />
        </svg>
        {MOTES.map((m, i) => (
          <span
            key={i}
            className={`climate-mote${i % 3 === 0 ? " is-heat" : i % 3 === 1 ? " is-air" : ""}`}
            style={{
              left: m.left,
              width: m.size + 1,
              height: m.size + 1,
              animationDelay: m.delay,
              animationDuration: m.duration,
            }}
          />
        ))}
        <div className="climate-vignette" />
      </div>

      <header className="gate-hero climate-hero">
        <MainLogo />
        <p className="gate-kicker">{tx("T.C. Sağlık Bakanlığı · COP31 Türkiye · Antalya 9–20 Kasım 2026")}</p>
        <h1 className="gate-slogan">
          {tx("Sağlıklı insan")}
          <br />
          <em>{tx("Sağlıklı gezegen")}</em>
        </h1>
        <p className="gate-lead">
          {tx("Isı yükseliyor, hava ağırlaşıyor, beden ödüyor. İklim değişikliği bir sağlık krizidir: solunum, sıcaklık, su ve gıda aynı nefeste.")}
        </p>
        {inApp ? (
          <p className="mt-3">
            <Link href={next && next.startsWith("/") ? next : "/dashboard"} className="text-sm underline underline-offset-4 text-[#C8EEFA]">
              {next?.startsWith("/sunucu") ? tx("Sunucu ekranına dön →") : tx("Hazırlık masasına dön →")}
            </Link>
          </p>
        ) : null}
      </header>

      <a href="/u" className="phone-qr-card">
        <img src={qrSrc} alt={tx("Uygulamayı telefona indir")} width={112} height={112} />
        <span>
          <strong>{tx("Uygulamayı telefona indir")}</strong>
          <em>{tx("Karekodu okutun, ana ekrana ekleyin.")}</em>
        </span>
      </a>

      <nav className="gates climate-gates" aria-label={tx("Giriş kapıları")}>
        {GATES.map((g) => (
          <a key={g.href} href={href(g.href, g.guest)} className={`gate${g.href === "/oyun" ? " is-play" : ""}`} style={{ textDecoration: "none" }}>
            <img src={g.src} alt="" />
            <div className="gate-shade" />
            <div className="gate-copy">
              <div className="text-[10px] tracking-[0.22em] uppercase opacity-80">{tx(g.kicker)}</div>
              <h2 className="display text-2xl md:text-3xl leading-tight mt-1">{tx(g.title)}</h2>
              <p>{tx(g.body)}</p>
              <span className="inline-block mt-3 text-xs tracking-[0.16em] uppercase">{tx("Kapıyı aç →")}</span>
            </div>
          </a>
        ))}
      </nav>
    </main>
  );
}
