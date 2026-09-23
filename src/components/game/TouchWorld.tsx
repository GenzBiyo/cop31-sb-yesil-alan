"use client";

import type { TouchKind, TouchMote, TouchSnap } from "@/lib/touch-live";
import { useI18n } from "@/components/I18nProvider";

const KIND_COPY: Record<TouchKind, { label: string; hint: string; from: string; to: string }> = {
  pollution: { label: "Kirlilik", hint: "Dokun, duman dağılsın", from: "#3d3a36", to: "#7a746c" },
  health: { label: "Sağlık", hint: "Dokun, toplum iyileşsin", from: "#0077C2", to: "#c45c48" },
  joy: { label: "Mutluluk", hint: "Dokun, yüzler gülsün", from: "#8a5a12", to: "#00A3E0" },
};

function SmogIcon() {
  return (
    <svg viewBox="0 0 64 64" className="touch-ico">
      <ellipse cx="28" cy="36" rx="16" ry="10" fill="#57534e" />
      <ellipse cx="40" cy="34" rx="14" ry="9" fill="#44403c" />
      <ellipse cx="34" cy="26" rx="11" ry="8" fill="#292524" />
      <circle cx="22" cy="44" r="3" fill="#1c1917" />
      <circle cx="44" cy="46" r="2.4" fill="#1c1917" />
    </svg>
  );
}

function SickIcon() {
  return (
    <svg viewBox="0 0 64 64" className="touch-ico">
      <circle cx="32" cy="22" r="10" fill="#C8EEFA" />
      <path d="M18 58c2-14 8-20 14-20s12 6 14 20" fill="#0077C2" />
      <circle cx="28" cy="21" r="1.6" fill="#1c1917" />
      <circle cx="36" cy="21" r="1.6" fill="#1c1917" />
      <path d="M27 28c3 2 7 2 10 0" stroke="#1c1917" strokeWidth="1.6" fill="none" />
      <path d="M42 14h8v3h-8z" fill="#c45c48" />
      <path d="M44.5 11.5v8" stroke="#c45c48" strokeWidth="3" />
    </svg>
  );
}

function SadIcon() {
  return (
    <svg viewBox="0 0 64 64" className="touch-ico">
      <circle cx="32" cy="32" r="20" fill="#00A3E0" />
      <circle cx="24" cy="28" r="2.4" fill="#1c1917" />
      <circle cx="40" cy="28" r="2.4" fill="#1c1917" />
      <path d="M24 44c4-6 12-6 16 0" stroke="#1c1917" strokeWidth="2.4" fill="none" />
    </svg>
  );
}

export function TouchMeters({ meters }: { meters: TouchSnap["meters"] }) {
  const { tx } = useI18n();
  const rows = [
    { key: "clean", label: tx("Çevre kirliliği azalsın"), value: meters.clean, color: "#22A34A" },
    { key: "health", label: tx("Toplum sağlığı artsın"), value: meters.health, color: "#0077C2" },
    { key: "joy", label: tx("İnsanlar mutlu olsun"), value: meters.joy, color: "#00A3E0" },
  ] as const;
  return (
    <div className="touch-meters">
      {rows.map((row) => (
        <div key={row.key} className="touch-meter">
          <div className="touch-meter-lab">
            <span>{row.label}</span>
            <strong>{row.value}</strong>
          </div>
          <div className="touch-meter-track">
            <div className="touch-meter-fill" style={{ width: `${row.value}%`, background: row.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TouchScene({ meters, bloom }: { meters: TouchSnap["meters"]; bloom?: boolean }) {
  const sky = bloom
    ? "linear-gradient(180deg, #7eb8d4 0%, #EEF8FD 55%, #d7e4d8 100%)"
    : `linear-gradient(180deg, ${mix("#4a433c", "#7eb8d4", meters.clean)} 0%, ${mix("#8a7d6b", "#EEF8FD", meters.joy)} 58%, ${mix("#3d2a22", "#d7e4d8", meters.health)} 100%)`;
  const tree = 0.35 + (meters.health / 100) * 0.65;
  return (
    <div className={`touch-scene ${bloom ? "is-bloom" : ""}`} style={{ background: sky }}>
      <div className="touch-sun" style={{ opacity: 0.25 + meters.joy / 140 }} />
      <div className="touch-smog" style={{ opacity: Math.max(0, 0.72 - meters.clean / 130) }} />
      <div className="touch-ground">
        <span className="touch-tree" style={{ transform: `scale(${tree})`, left: "12%" }} />
        <span className="touch-tree is-mid" style={{ transform: `scale(${tree * 0.9})`, left: "48%" }} />
        <span className="touch-tree is-tall" style={{ transform: `scale(${tree * 1.1})`, left: "78%" }} />
      </div>
    </div>
  );
}

function mix(a: string, b: string, t: number) {
  const p = Math.max(0, Math.min(1, t / 100));
  const ha = parseInt(a.slice(1), 16);
  const hb = parseInt(b.slice(1), 16);
  const ch = (shift: number) => {
    const ca = (ha >> shift) & 255;
    const cb = (hb >> shift) & 255;
    return Math.round(ca + (cb - ca) * p);
  };
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
}

function MoteGlyph({ kind }: { kind: TouchKind }) {
  if (kind === "pollution") return <SmogIcon />;
  if (kind === "health") return <SickIcon />;
  return <SadIcon />;
}

export function TouchField({
  motes,
  onTap,
  large,
}: {
  motes: TouchMote[];
  onTap?: (id: string) => void;
  large?: boolean;
}) {
  return (
    <div className={`touch-field ${large ? "is-large" : ""}`}>
      {motes.map((m) => {
        const copy = KIND_COPY[m.kind];
        const inner = (
            <>
              <MoteGlyph kind={m.kind} />
              <span className="touch-mote-lab">{copy.label}</span>
            </>
        );
        if (onTap) {
          return (
            <button
              key={m.id}
              type="button"
              className={`touch-mote is-${m.kind}`}
              style={{ left: `${m.x}%`, top: `${m.y}%`, background: copy.from }}
              aria-label={copy.hint}
              onClick={() => onTap(m.id)}
            >
              {inner}
            </button>
          );
        }
        return (
          <div
            key={m.id}
            className={`touch-mote is-${m.kind}`}
            style={{ left: `${m.x}%`, top: `${m.y}%`, background: copy.from }}
          >
            {inner}
          </div>
        );
      })}
    </div>
  );
}
