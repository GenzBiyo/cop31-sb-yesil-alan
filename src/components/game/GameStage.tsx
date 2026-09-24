"use client";

import { useI18n } from "@/components/I18nProvider";

export function GameStage({
  kicker,
  title,
  lead,
  children,
  live,
  wide,
}: {
  kicker: string;
  title: string;
  lead?: string;
  children: React.ReactNode;
  live?: boolean;
  wide?: boolean;
}) {
  const { tx } = useI18n();
  return (
    <main className="game-arena">
      <header className="game-arena-hero">
        <span className="game-arena-beam" aria-hidden />
        <span className="game-arena-beam is-2" aria-hidden />
        <span className="game-arena-spark" aria-hidden />
        <div className="game-arena-top">
          <p className="game-arena-kicker">{tx(kicker)}</p>
          {live ? <span className="game-live">{tx("CANLI")}</span> : null}
        </div>
        <h1 className="display game-arena-title">{tx(title)}</h1>
        {lead ? <p className="game-arena-lead">{tx(lead)}</p> : null}
      </header>
      <div className={`game-arena-body ${wide ? "is-wide" : ""}`}>{children}</div>
    </main>
  );
}
