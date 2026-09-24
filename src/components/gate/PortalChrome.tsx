"use client";

import Link from "next/link";
import { MOTES } from "./motes";
import { useI18n } from "@/components/I18nProvider";

export function PortalChrome({
  image,
  kicker,
  title,
  lead,
  children,
}: {
  image: string;
  kicker: string;
  title: string;
  lead: string;
  children: React.ReactNode;
}) {
  const { tx } = useI18n();
  return (
    <main className="portal">
      <section className="portal-visual">
        <img src={image} alt="" />
        <div className="shade" />
        <div className="climate-heat climate-heat-soft" />
        <span className="climate-ring portal-ring" />
        {MOTES.slice(0, 10).map((m, i) => (
          <span
            key={i}
            className={`climate-mote${i % 2 ? " is-air" : " is-heat"}`}
            style={{
              left: m.left,
              width: m.size,
              height: m.size,
              animationDelay: m.delay,
              animationDuration: m.duration,
            }}
          />
        ))}
        <div className="relative z-10 flex h-full min-h-[42vh] flex-col justify-end p-8 md:p-12">
          <span className="self-start mb-4 px-2 py-1 text-[10px] tracking-[0.28em] uppercase" style={{ background: "#00A3E0", color: "#FFFFFF" }}>COP31 TÜRKİYE</span>
          <Link href="/" className="text-xs tracking-[0.2em] uppercase opacity-80 underline underline-offset-4">{tx("← Kapılara dön")}</Link>
          <p className="text-xs tracking-[0.28em] uppercase mt-8 opacity-80">{tx(kicker)}</p>
          <h1 className="display text-4xl md:text-5xl mt-2 leading-tight">{tx(title)}</h1>
          <p className="mt-3 max-w-lg text-[#C8EEFA]">{tx(lead)}</p>
          <p className="mt-6 display text-2xl italic text-[#d7e4d8]">{tx("Sağlıklı insan, sağlıklı gezegen")}</p>
        </div>
      </section>
      <section className="portal-panel">
        <div className="portal-card">{children}</div>
      </section>
    </main>
  );
}
