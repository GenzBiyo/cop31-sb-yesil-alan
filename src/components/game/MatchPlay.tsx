"use client";

import { CONCEPTS } from "@/lib/match-cards";
import type { MemCard, PairItem, PlayerMatchView } from "@/lib/match-live";
import { useI18n } from "@/components/I18nProvider";

export function MemoryGrid({
  cards,
  onFlip,
  locked,
}: {
  cards: MemCard[];
  onFlip: (id: string) => void;
  locked?: boolean;
}) {
  const { tx } = useI18n();
  return (
    <div className="mem-grid">
      {cards.map((c) => (
        <button
          key={c.id}
          type="button"
          disabled={locked || c.done || c.up}
          className={`mem-card ${c.up || c.done ? "is-up" : ""} ${c.done ? "is-done" : ""}`}
          onClick={() => onFlip(c.id)}
        >
          <span className="mem-back">{tx("YEŞİL")}</span>
          <span className="mem-face">{tx(c.text)}</span>
        </button>
      ))}
    </div>
  );
}

export function PairColumns({
  left,
  right,
  pickedLeft,
  pickedRight,
  onPick,
  locked,
}: {
  left: PairItem[];
  right: PairItem[];
  pickedLeft?: string | null;
  pickedRight?: string | null;
  onPick: (side: "left" | "right", id: string) => void;
  locked?: boolean;
}) {
  const { tx } = useI18n();
  return (
    <div className="pair-cols">
      <div className="pair-col">
        {left.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={locked || item.done}
            className={`pair-chip ${item.done ? "is-done" : ""} ${pickedLeft === item.id ? "is-picked" : ""}`}
            onClick={() => onPick("left", item.id)}
          >
            {tx(item.text)}
          </button>
        ))}
      </div>
      <div className="pair-col">
        {right.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={locked || item.done}
            className={`pair-chip is-hint ${item.done ? "is-done" : ""} ${pickedRight === item.id ? "is-picked" : ""}`}
            onClick={() => onPick("right", item.id)}
          >
            {tx(item.text)}
          </button>
        ))}
      </div>
    </div>
  );
}

export function MatchStatus({ view }: { view: PlayerMatchView }) {
  const { tx } = useI18n();
  return (
    <div className="flex justify-between items-end gap-3">
      <div>
        <div className="text-xs tracking-[0.16em] uppercase text-[#0077C2]">
          {view.mode === "memory" ? tx("Hafıza") : tx("Eşleştirme")}
        </div>
        <p className="text-sm text-[#57534e] mt-1">
          {view.mode === "memory" ? tx("İki kart aç, aynı konsepti tuttur.") : tx("Soldan konsept, sağdan açıklamasını seç.")}
        </p>
      </div>
      <div className="text-right">
        <div className="text-xs text-[#57534e]">{tx("Bu tur")}</div>
        <div className="display text-4xl text-[#0077C2]">{view.score}</div>
      </div>
    </div>
  );
}

export function SolvedChips({ solved }: { solved: string[] }) {
  const { tx } = useI18n();
  const on = new Set(solved);
  return (
    <div className="concept-chips">
      {CONCEPTS.filter((c) => c.n <= 9).map((c) => (
        <span key={c.id} className={`concept-chip ${on.has(c.id) ? "is-on" : ""}`}>
          <b>{c.n}</b>
          {tx(c.title)}
        </span>
      ))}
    </div>
  );
}

export function MatchPlay({
  view,
  onFlip,
  onPick,
  locked,
}: {
  view: PlayerMatchView;
  onFlip: (id: string) => void;
  onPick: (side: "left" | "right", id: string) => void;
  locked?: boolean;
}) {
  const { tx } = useI18n();
  return (
    <div className="space-y-3">
      <MatchStatus view={view} />
      {view.last === "ok" ? <p className="text-sm font-semibold" style={{ color: "#22A34A" }}>{tx("Doğru · +10 puan")}</p> : null}
      {view.last === "bad" ? <p className="text-sm font-semibold" style={{ color: "#E31C23" }}>{tx("Eşleşmedi, tekrar dene")}</p> : null}
      {view.remainingPairs === 0 ? <p className="text-sm" style={{ color: "#22A34A" }}>{tx("Bu turdaki tüm çiftler tamam.")}</p> : null}
      {view.mode === "memory" && view.cards ? (
        <MemoryGrid cards={view.cards} onFlip={onFlip} locked={locked} />
      ) : view.left && view.right ? (
        <PairColumns left={view.left} right={view.right} pickedLeft={view.pickedLeft} pickedRight={view.pickedRight} onPick={onPick} locked={locked} />
      ) : null}
    </div>
  );
}
