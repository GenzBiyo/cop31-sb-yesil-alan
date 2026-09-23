"use client";

import { useEffect, useState } from "react";
import { WHEEL_COAST_DEG_PER_MS, type WheelMotion, type WheelMode } from "@/lib/wheel";
import { useI18n } from "@/components/I18nProvider";

export type WheelSlice = { id?: string; label: string; color: string; kind?: string };

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function slicePath(i: number, n: number) {
  const arc = 360 / n;
  const a0 = i * arc;
  const a1 = (i + 1) * arc;
  const p0 = polar(100, 100, 96, a0);
  const p1 = polar(100, 100, 96, a1);
  const large = arc > 180 ? 1 : 0;
  return `M 100 100 L ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A 96 96 0 ${large} 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} Z`;
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export function useWheelMotion(motion: WheelMotion) {
  const { mode, from, target, startedAt, seconds } = motion;
  const [angle, setAngle] = useState(mode === "idle" ? target : from);

  useEffect(() => {
    if (mode === "idle" || !startedAt) {
      setAngle(target);
      return;
    }
    const start = new Date(startedAt).getTime();
    let raf = 0;
    const tick = () => {
      const now = Date.now();
      if (mode === "coast") {
        setAngle(from + Math.max(0, now - start) * WHEEL_COAST_DEG_PER_MS);
        raf = requestAnimationFrame(tick);
        return;
      }
      const dur = Math.max(400, seconds * 1000);
      const t = Math.min(1, (now - start) / dur);
      setAngle(from + (target - from) * easeOutCubic(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [mode, from, target, startedAt, seconds]);

  return angle;
}

export function useWheelAngle(target: number, startedAt: string | Date | null | undefined, seconds: number, spinning: boolean) {
  return useWheelMotion({
    mode: spinning ? "stop" : "idle",
    from: 0,
    target,
    startedAt,
    seconds,
  });
}

function sliceInk(hex: string) {
  const h = hex.replace("#", "");
  if (h.length < 6) return "#0B1C33";
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.68 ? "#0B1C33" : "#FFFFFF";
}

function sliceLabelLayout(label: string, n: number) {
  const radial = n > 12 ? 58 : n > 8 ? 66 : 72;
  const font = Math.max(8.2, Math.min(n > 10 ? 10 : 12.2, 86 / Math.max(4, label.length * 0.38)));
  const rMid = 24 + radial / 2;
  const natural = label.length * font * 0.56;
  return { font, radial, rMid, y: 100 - rMid, fit: natural > radial + 2 };
}

export function PrizeWheel({
  slices,
  angle,
  size = 420,
  highlight = null,
  spinning,
  mode,
}: {
  slices: WheelSlice[];
  angle: number;
  size?: number;
  highlight?: number | null;
  spinning?: boolean;
  mode?: WheelMode;
}) {
  const n = Math.max(slices.length, 1);
  const motion = mode || (spinning ? "stop" : "idle");
  const { tx } = useI18n();

  return (
    <div className={`prize-wheel ${motion !== "idle" ? "is-spinning" : ""} is-${motion}`} style={{ width: size, height: size }}>
      <div className="prize-pointer" aria-hidden>
        <span />
      </div>
      <svg viewBox="0 0 200 200" className="prize-disk" style={{ transform: `rotate(${angle}deg)` }}>
        <circle cx="100" cy="100" r="99" fill="#0088C8" />
        {slices.map((s, i) => {
          const arc = 360 / n;
          const mid = i * arc + arc / 2;
          const on = highlight === i;
          const layout = sliceLabelLayout(tx(s.label), n);
          const ink = sliceInk(s.color);
          return (
            <g key={s.id || `${s.label}-${i}`}>
              <path d={slicePath(i, n)} fill={s.color} stroke={on ? "#0077C2" : "none"} strokeWidth={on ? 1.8 : 0} />
              <text
                x="100"
                y={layout.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={ink}
                fontSize={layout.font}
                fontWeight={400}
                letterSpacing={s.label.length > 12 ? -0.2 : 0.08}
                transform={`rotate(${mid} 100 100) rotate(-90 100 ${layout.y})`}
                {...(layout.fit ? { textLength: layout.radial, lengthAdjust: "spacingAndGlyphs" as const } : {})}
              >
                {tx(s.label)}
              </text>
            </g>
          );
        })}
        <circle cx="100" cy="100" r="18" fill="#EEF8FD" />
        <circle cx="100" cy="100" r="12" fill="#0088C8" />
        <circle cx="100" cy="100" r="5" fill="#00A3E0" />
      </svg>
    </div>
  );
}

export function WheelSpinButtons({
  mode,
  busy,
  canSpin,
  canStop,
  onSpin,
  onStop,
}: {
  mode: WheelMode;
  busy?: boolean;
  canSpin: boolean;
  canStop: boolean;
  onSpin: () => void;
  onStop: () => void;
}) {
  const { tx } = useI18n();
  if (mode === "stop") {
    return (
      <button className="btn w-full justify-center wheel-btn is-slowing" type="button" disabled>
        {tx("Duruyor…")}
      </button>
    );
  }
  if (mode === "coast") {
    return (
      <button className="btn w-full justify-center wheel-btn is-stop" type="button" disabled={busy || !canStop} onClick={onStop}>
        {busy ? tx("Durduruluyor…") : tx("Durdur")}
      </button>
    );
  }
  return (
    <button className="btn w-full justify-center wheel-btn" type="button" disabled={busy || !canSpin} onClick={onSpin}>
      {busy ? tx("Çevriliyor…") : tx("Çevir")}
    </button>
  );
}
