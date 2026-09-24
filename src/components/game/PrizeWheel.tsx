"use client";

import { useEffect, useId, useRef, useState } from "react";
import { WHEEL_COAST_DEG_PER_MS, WHEEL_STOP_SEC, type WheelMotion, type WheelMode } from "@/lib/wheel";
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
  const p0 = polar(100, 100, 88, a0);
  const p1 = polar(100, 100, 88, a1);
  const large = arc > 180 ? 1 : 0;
  return `M 100 100 L ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A 88 88 0 ${large} 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} Z`;
}

function easeOutQuad(t: number) {
  return 1 - (1 - t) * (1 - t);
}

function distanceToLand(origin: number, land: number, minDistance: number) {
  const landMod = ((land % 360) + 360) % 360;
  const originMod = ((origin % 360) + 360) % 360;
  let delta = (landMod - originMod + 360) % 360;
  if (delta > 359.2) delta = 0;
  if (delta < 0.6 && minDistance <= 0) return 0;
  while (delta < minDistance) delta += 360;
  return delta;
}

export function useWheelMotion(motion: WheelMotion) {
  const motionRef = useRef(motion);
  motionRef.current = motion;
  const [angle, setAngle] = useState(() => (motion.mode === "idle" ? motion.target : motion.from));
  const shown = useRef(angle);

  useEffect(() => {
    let raf = 0;
    let phase: WheelMode = "idle";
    let stopOrigin = 0;
    let stopDist = 0;
    let stopT0 = 0;
    let stopDur = 1;
    let stopLand = Number.NaN;
    const v0 = WHEEL_COAST_DEG_PER_MS;
    const minStop = 0.5 * v0 * WHEEL_STOP_SEC * 1000;

    const tick = () => {
      const m = motionRef.current;
      if (m.mode === "coast") {
        phase = "coast";
        stopLand = Number.NaN;
        const start = m.startedAt ? new Date(m.startedAt).getTime() : Date.now();
        const next = m.from + Math.max(0, Date.now() - start) * v0;
        shown.current = next;
        setAngle(next);
      } else if (m.mode === "stop" || phase === "stop") {
        const land = ((m.target % 360) + 360) % 360;
        if (phase !== "stop" || (m.mode === "stop" && Math.abs(land - stopLand) > 0.8)) {
          phase = "stop";
          stopLand = land;
          stopOrigin = shown.current;
          stopDist = distanceToLand(stopOrigin, m.target, minStop);
          stopDur = Math.max(3200, Math.min(9000, (2 * Math.max(stopDist, minStop)) / v0));
          stopT0 = Date.now();
        }
        const t = Math.min(1, (Date.now() - stopT0) / stopDur);
        const next = stopOrigin + stopDist * easeOutQuad(t);
        shown.current = next;
        setAngle(next);
        if (t >= 1 && m.mode !== "stop") phase = "idle";
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);

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
  const radial = n > 12 ? 50 : n > 8 ? 58 : 64;
  const font = Math.max(8.2, Math.min(n > 10 ? 10 : 12.2, 86 / Math.max(4, label.length * 0.38)));
  const rMid = 26 + radial / 2;
  const natural = label.length * font * 0.56;
  return { font, radial, rMid, y: 100 - rMid, fit: natural > radial + 2 };
}

const LAMPS = 28;

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
  const uid = useId().replace(/:/g, "");

  return (
    <div className={`prize-wheel ${motion !== "idle" ? "is-spinning" : ""} is-${motion}`} style={{ width: size, height: size }}>
      <div className="prize-halo" aria-hidden />
      <svg viewBox="0 0 200 200" className="prize-rim" aria-hidden>
        <defs>
          <linearGradient id={`${uid}-rim`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#5EC8F0" />
            <stop offset="45%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#00A3E0" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="98" fill={`url(#${uid}-rim)`} />
        <circle cx="100" cy="100" r="91.5" fill="#0077C2" />
        {Array.from({ length: LAMPS }, (_, i) => {
          const p = polar(100, 100, 94.8, (i / LAMPS) * 360);
          return (
            <circle
              key={i}
              className={`prize-lamp ${i % 2 ? "is-alt" : ""}`}
              cx={p.x}
              cy={p.y}
              r="2.15"
              fill={i % 3 === 0 ? "#E31C23" : i % 3 === 1 ? "#FFFFFF" : "#32C45A"}
            />
          );
        })}
      </svg>
      <div className="prize-pointer" aria-hidden>
        <svg viewBox="0 0 36 44">
          <polygon points="18,42 2,4 34,4" fill="#E31C23" />
          <polygon points="18,36 8,8 28,8" fill="#FFFFFF" />
          <circle cx="18" cy="10" r="3.2" fill="#00A3E0" />
        </svg>
      </div>
      <svg viewBox="0 0 200 200" className="prize-disk" style={{ transform: `rotate(${angle}deg)` }}>
        <defs>
          <radialGradient id={`${uid}-hub`} cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="#5EC8F0" />
            <stop offset="55%" stopColor="#00A3E0" />
            <stop offset="100%" stopColor="#0077C2" />
          </radialGradient>
        </defs>
        {slices.map((s, i) => {
          const arc = 360 / n;
          const mid = i * arc + arc / 2;
          const on = highlight === i;
          const layout = sliceLabelLayout(tx(s.label), n);
          const ink = sliceInk(s.color);
          return (
            <g key={s.id || `${s.label}-${i}`}>
              <path d={slicePath(i, n)} fill={s.color} stroke={on ? "#FFFFFF" : "rgba(255,255,255,0.35)"} strokeWidth={on ? 2.4 : 0.6} />
              <text
                x="100"
                y={layout.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={ink}
                fontSize={layout.font}
                fontWeight={700}
                letterSpacing={s.label.length > 12 ? -0.2 : 0.08}
                transform={`rotate(${mid} 100 100) rotate(-90 100 ${layout.y})`}
                {...(layout.fit ? { textLength: layout.radial, lengthAdjust: "spacingAndGlyphs" as const } : {})}
              >
                {tx(s.label)}
              </text>
            </g>
          );
        })}
        <circle cx="100" cy="100" r="22" fill="#FFFFFF" />
        <circle cx="100" cy="100" r="18" fill={`url(#${uid}-hub)`} />
        <circle cx="100" cy="100" r="7" fill="#E31C23" />
        <circle cx="100" cy="100" r="3.2" fill="#FFFFFF" />
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
