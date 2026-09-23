"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/components/I18nProvider";

type Player = {
  id: string;
  rank: number;
  nickname: string;
  teamName: string;
  score: number;
  winner?: boolean;
  teamColor?: string;
};

type Team = { name: string; color: string; score: number; members: number };

const MEDAL = ["#00A3E0", "#8f97a3", "#c17a3a"];

function useCount(n: number) {
  const [v, setV] = useState(n);
  const prev = useRef(n);
  useEffect(() => {
    const from = prev.current;
    prev.current = n;
    if (from === n) {
      setV(n);
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setV(n);
      return;
    }
    const start = performance.now();
    const dur = 800;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - (1 - p) ** 3;
      setV(Math.round(from + (n - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [n]);
  return v;
}

function Count({ n, className }: { n: number; className?: string }) {
  const v = useCount(n);
  return <span className={className}>{v}</span>;
}

function RankBadge({ rank }: { rank: number }) {
  const medal = MEDAL[rank - 1];
  return (
    <span
      className="score-rank"
      style={
        medal
          ? { background: medal, color: "#1c1917", boxShadow: `0 0 0 3px ${medal}33` }
          : { background: "#0088C8", color: "#EEF8FD" }
      }
    >
      {rank}
    </span>
  );
}

function RaceRow({
  player,
  max,
  delay,
  dark,
}: {
  player: Player;
  max: number;
  delay: number;
  dark?: boolean;
}) {
  const pct = max > 0 ? Math.max(8, Math.round((player.score / max) * 100)) : 8;
  const bar = player.rank === 1 ? "#00A3E0" : player.rank === 2 ? "#8f97a3" : player.rank === 3 ? "#c17a3a" : player.teamColor || "#0077C2";
  return (
    <div className={`score-row ${player.rank === 1 ? "is-lead" : ""} ${player.winner ? "is-winner" : ""}`} style={{ animationDelay: `${delay}ms` }}>
      <RankBadge rank={player.rank} />
      <div className="min-w-0 flex-1">
        <div className="flex justify-between gap-2 items-baseline">
          <span className="score-name truncate">{player.nickname}</span>
          <span className="score-pts tabular-nums">
            <Count n={player.score} />
            <span className="score-pts-label"> pn</span>
          </span>
        </div>
        <div className="score-track" style={{ background: dark ? "rgba(244,239,230,0.12)" : "#D8F0FA" }}>
          <div className="score-fill" style={{ width: `${pct}%`, background: bar, animationDelay: `${delay + 80}ms` }}>
            <span className="score-shine" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Podium({ players }: { players: Player[] }) {
  const first = players.find((p) => p.rank === 1);
  const second = players.find((p) => p.rank === 2);
  const third = players.find((p) => p.rank === 3);
  const slots = [
    { p: second, h: 112, rank: 2 },
    { p: first, h: 156, rank: 1 },
    { p: third, h: 88, rank: 3 },
  ];
  return (
    <div className="score-podium">
      {slots.map(({ p, h, rank }) =>
        p ? (
          <div key={p.id} className={`score-podium-col is-${rank}`} style={{ minHeight: h }}>
            <div className="score-podium-avatar" style={{ borderColor: MEDAL[rank - 1] }}>
              {p.nickname.slice(0, 1).toUpperCase()}
            </div>
            <div className="score-podium-nick">{p.nickname}</div>
            <div className="display score-podium-score">
              <Count n={p.score} />
            </div>
            <div className="score-podium-step" style={{ background: MEDAL[rank - 1], minHeight: h * 0.42 }}>
              {rank}.
            </div>
          </div>
        ) : (
          <div key={rank} />
        ),
      )}
    </div>
  );
}

export function Scoreboard({
  players,
  teams,
  variant = "full",
  tone = "light",
}: {
  players: Player[];
  teams?: Team[];
  variant?: "full" | "compact";
  tone?: "light" | "dark";
}) {
  const { tx } = useI18n();
  const max = Math.max(1, ...players.map((p) => p.score), ...(teams || []).map((t) => t.score));
  const dark = tone === "dark";
  const teamMax = Math.max(1, ...(teams || []).map((t) => t.score));

  if (players.length === 0) {
    return <p className="text-sm opacity-70">{tx("Henüz oyuncu yok.")}</p>;
  }

  return (
    <div className={`scoreboard ${dark ? "is-dark" : ""} ${variant}`}>
      {teams && teams.length > 0 ? (
        <div className="score-teams">
          {teams.map((t, i) => (
            <div key={t.name} className="score-team" style={{ animationDelay: `${i * 70}ms` }}>
              <div className="flex justify-between text-sm mb-1">
                <span style={{ color: t.color }}>{t.name}</span>
                <span className="tabular-nums font-semibold">
                  <Count n={t.score} /> · {t.members}
                </span>
              </div>
              <div className="score-track">
                <div
                  className="score-fill"
                  style={{ width: `${Math.max(10, (t.score / teamMax) * 100)}%`, background: t.color, animationDelay: `${i * 70}ms` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {variant === "full" && players.some((p) => p.rank <= 3) ? <Podium players={players} /> : null}

      <div className="score-race">
        {players.map((p, i) => (
          <RaceRow key={p.id} player={p} max={max} delay={i * 55} dark={dark} />
        ))}
      </div>
    </div>
  );
}

export function NameList({
  title,
  tone,
  people,
}: {
  title: string;
  tone: "ok" | "bad" | "muted";
  people: { id: string; nickname: string; teamName: string }[];
}) {
  const { tx } = useI18n();
  const color = tone === "ok" ? "#22A34A" : tone === "bad" ? "#E31C23" : "#3E6A88";
  return (
    <div>
      <div className="text-xs tracking-[0.14em] uppercase" style={{ color }}>
        {tx(title)} · {people.length}
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
        {people.length === 0 ? <span className="text-sm text-[#57534e]">—</span> : null}
        {people.map((p, i) => (
          <span
            key={p.id}
            className="score-chip"
            style={{
              animationDelay: `${i * 40}ms`,
              background: tone === "ok" ? "#e7f0ea" : tone === "bad" ? "#FAD4D6" : "#fff",
              color,
            }}
          >
            {p.nickname}
          </span>
        ))}
      </div>
    </div>
  );
}

export function TimerRing({ remaining, total }: { remaining: number; total: number }) {
  const { tx } = useI18n();
  const t = Math.max(0, remaining);
  const pct = total ? Math.max(0, Math.min(1, t / total)) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="display text-5xl tabular-nums" style={{ color: t <= 5 ? "#0077C2" : "#22A34A" }}>
        {t}
      </div>
      <div className="flex-1 h-3 bg-[#DCE8F0] overflow-hidden">
        <div
          className="h-full"
          style={{
            width: `${pct * 100}%`,
            background: t <= 5 ? "#0077C2" : "#22A34A",
            transition: "width 0.2s linear",
          }}
        />
      </div>
      <span className="text-xs text-[#57534e]">{tx("sn")}</span>
    </div>
  );
}
