"use client";

import { FormEvent, useEffect, useId, useState } from "react";
import {
  BMI_SCALE,
  bmiMarkerPct,
  estimateCarbon,
  formatTonnes,
  parseKiloInput,
  TARGET_YEAR,
  type KiloResult,
  type KiloSex,
} from "@/lib/kilo-carbon";
import type { KiloPublic } from "@/lib/kilo-live";
import { useI18n } from "@/components/I18nProvider";

function useKiloClock(token: string, ms = 6400) {
  const [t, setT] = useState(0);
  useEffect(() => {
    setT(0);
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      setT(1 - Math.pow(1 - p, 3));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [token, ms]);
  return t;
}

export const AIR_STAGES = [
  { id: 1, label: "Açık hava", hint: "Dağ ve deniz nefesi", fill: "#3d8f6e", gas: "#7dcea0" },
  { id: 2, label: "Hafif pus", hint: "Kent kenarı, henüz rahat", fill: "#6a8f62", gas: "#c9b227" },
  { id: 3, label: "Kent havası", hint: "Trafik ve ısı birikir", fill: "#b45309", gas: "#e2b84c" },
  { id: 4, label: "Ağır sis", hint: "Göğüs daralır, görüş düşer", fill: "#9a3412", gas: "#c45c48" },
  { id: 5, label: "Kötü hava", hint: "Kirli, boğucu, sağlıksız", fill: "#3a4250", gas: "#6b7380" },
] as const;

export function airStageAt(level: number) {
  const i = Math.max(1, Math.min(5, Math.round(level))) - 1;
  return AIR_STAGES[i];
}

export function KiloForm({
  onSubmit,
  busy,
}: {
  onSubmit: (sex: KiloSex, age: number, heightCm: number, weightKg: number) => void;
  busy?: boolean;
}) {
  const [sex, setSex] = useState<KiloSex | "">("");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [err, setErr] = useState("");
  const { tx } = useI18n();

  function send(e: FormEvent) {
    e.preventDefault();
    const parsed = parseKiloInput({ sex, age, heightCm: height, weightKg: weight });
    if (!parsed) {
      setErr("Cinsiyet seç. Yaş 10–90, boy 120–220 cm, kilo 30–220 kg gir.");
      return;
    }
    setErr("");
    onSubmit(parsed.sex, parsed.age, parsed.heightCm, parsed.weightKg);
  }

  return (
    <form className="card p-4 space-y-3" onSubmit={send}>
      <h2 className="display text-3xl">{tx("Cinsiyet, yaş, boy, kilo")}</h2>
      <p className="text-sm text-[#57534e]">
        {tx("BKİ’yi boy–kilo tablosuna göre okuruz; enerji ihtiyacı cinsiyete göre değişir. Tıbbi tanı değildir.")}
      </p>
      <fieldset className="kilo-sex">
        <legend className="text-xs text-[#57534e] mb-1">{tx("Cinsiyet")}</legend>
        <div className="kilo-sex-row">
          <button type="button" className={`kilo-sex-btn ${sex === "kadin" ? "is-on" : ""}`} onClick={() => setSex("kadin")}>
            {tx("Kadın")}
          </button>
          <button type="button" className={`kilo-sex-btn ${sex === "erkek" ? "is-on" : ""}`} onClick={() => setSex("erkek")}>
            {tx("Erkek")}
          </button>
        </div>
      </fieldset>
      <div className="grid grid-cols-3 gap-2">
        <label className="text-xs text-[#57534e]">{tx("Yaş")}
          <input className="field mt-1" inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} placeholder="34" required />
        </label>
        <label className="text-xs text-[#57534e]">{tx("Boy (cm)")}
          <input className="field mt-1" inputMode="numeric" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="170" required />
        </label>
        <label className="text-xs text-[#57534e]">{tx("Kilo (kg)")}
          <input className="field mt-1" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="72" required />
        </label>
      </div>
      {err ? <p className="text-sm text-[#0077C2]">{tx(err)}</p> : null}
      <button className="btn w-full justify-center" disabled={busy}>{busy ? tx("Hesaplanıyor…") : tx("2035’e kadar izimi göster")}</button>
    </form>
  );
}

function BmiScale({ result }: { result: KiloResult }) {
  const pin = bmiMarkerPct(result.bmi);
  const { tx } = useI18n();
  return (
    <div className="kilo-bmi">
      <div className="kilo-bmi-top">
        <span>{tx("BKİ tablosu")}</span>
        <strong style={{ color: result.bmiColor }}>{result.bmi} · {tx(result.bmiLabel)}</strong>
      </div>
      <div className="kilo-bmi-bar" aria-hidden>
        {BMI_SCALE.map((b) => (
          <span key={b.id} style={{ background: b.color, flex: Math.max(1.2, b.upTo - b.from) }} />
        ))}
        <i className="kilo-bmi-pin" style={{ left: `${pin}%` }} />
      </div>
      <div className="kilo-bmi-keys">
        {BMI_SCALE.map((b) => (
          <span key={b.id} className={b.id === result.bmiBand ? "is-on" : ""}>
            <i style={{ background: b.color }} />
            {tx(b.label)}
          </span>
        ))}
      </div>
      <p className="kilo-bmi-range">
        {tx(result.sexLabel)} · {result.heightCm} cm {tx("için yeşil bant")} {result.healthyMinKg}–{result.healthyMaxKg} kg
      </p>
    </div>
  );
}

function Co2Tank({ fill, level, large }: { fill: number; level: number; large?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const f = Math.max(0, Math.min(1, fill));
  const stage = airStageAt(level);
  const bodyTop = 62;
  const bodyH = 188;
  const pad = 3;
  const innerH = bodyH - pad * 2;
  const fillH = innerH * f;
  const fillY = bodyTop + pad + (innerH - fillH);
  const H = large ? 300 : 268;
  const metal = `kilo-tank-metal-${uid}`;
  const gas = `kilo-tank-gas-${uid}`;
  const clip = `kilo-tank-clip-${uid}`;

  return (
    <svg className="kilo-tank" viewBox="0 0 132 280" height={H} role="img" aria-label={`CO₂ tüpü yüzde ${Math.round(f * 100)} dolu`}>
      <defs>
        <linearGradient id={metal} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#1a3348" />
          <stop offset="35%" stopColor="#8a8680" />
          <stop offset="70%" stopColor="#4a4844" />
          <stop offset="100%" stopColor="#2a2826" />
        </linearGradient>
        <linearGradient id={gas} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={stage.fill} />
          <stop offset="100%" stopColor={stage.gas} />
        </linearGradient>
        <clipPath id={clip}>
          <rect x="36" y={bodyTop + pad} width="60" height={innerH} rx="14" />
        </clipPath>
      </defs>
      <circle cx="66" cy="16" r="11" fill="none" stroke="#00A3E0" strokeWidth="3.2" />
      <line x1="66" y1="5" x2="66" y2="27" stroke="#00A3E0" strokeWidth="2.4" />
      <line x1="55" y1="16" x2="77" y2="16" stroke="#00A3E0" strokeWidth="2.4" />
      <rect x="60" y="26" width="12" height="18" rx="2" fill="#5c5852" stroke="#00A3E0" strokeWidth="1.2" />
      <path d="M48 52 Q66 40 84 52 L84 68 Q66 78 48 68 Z" fill={`url(#${metal})`} stroke="#00A3E0" strokeWidth="1.4" />
      <rect x="34" y={bodyTop} width="64" height={bodyH} rx="18" fill={`url(#${metal})`} stroke="#00A3E0" strokeWidth="1.8" />
      <g clipPath={`url(#${clip})`}>
        <rect x="36" y={fillY} width="60" height={fillH + 2} fill={`url(#${gas})`} />
        {f > 0.04 ? (
          <path
            d={`M36 ${fillY + 4} Q51 ${fillY - 5} 66 ${fillY + 3} T96 ${fillY + 2} L96 ${fillY + 18} L36 ${fillY + 18} Z`}
            fill={stage.gas}
            opacity="0.55"
          />
        ) : null}
        {f > 0.18 ? <circle className="kilo-bubble" cx="52" cy={fillY + fillH * 0.55} r="3.2" fill="rgba(244,239,230,0.35)" /> : null}
        {f > 0.4 ? <circle className="kilo-bubble" cx="74" cy={fillY + fillH * 0.32} r="2.4" fill="rgba(244,239,230,0.28)" /> : null}
        {f > 0.65 ? <circle className="kilo-bubble" cx="60" cy={fillY + fillH * 0.72} r="4" fill="rgba(244,239,230,0.22)" /> : null}
      </g>
      {[1, 2, 3, 4, 5].map((n) => {
        const y = bodyTop + pad + innerH * (1 - n / 5);
        const on = f * 5 >= n - 0.02;
        return (
          <g key={n}>
            <line x1="98" y1={y} x2={on ? 108 : 104} y2={y} stroke={on ? "#00A3E0" : "rgba(244,239,230,0.35)"} strokeWidth="1.6" />
            <text x="111" y={y + 3.5} fill={on ? "#00A3E0" : "rgba(244,239,230,0.4)"} fontSize="9" fontWeight={700}>{n}</text>
          </g>
        );
      })}
      <text x="66" y="168" textAnchor="middle" fill="#EEF8FD" fontSize="13" fontWeight="700" letterSpacing="1.5" opacity="0.9">CO₂</text>
      <text x="66" y="268" textAnchor="middle" fill="#C8EEFA" fontSize="10">{Math.round(f * 100)}%</text>
    </svg>
  );
}

const AIR_SKIES = [
  "/kilo/air-1.jpg",
  "/kilo/air-2.jpg",
  "/kilo/air-3.jpg",
  "/kilo/air-4.jpg",
  "/kilo/air-5.jpg",
];

function skyOpacity(index: number, fill: number) {
  const x = Math.max(0, Math.min(1, fill)) * (AIR_SKIES.length - 1);
  const d = Math.abs(x - index);
  if (d >= 1) return 0;
  return 1 - d;
}

function AirSkies({ fill }: { fill: number }) {
  return (
    <div className="kilo-skies" aria-hidden>
      {AIR_SKIES.map((src, i) => (
        <img key={src} src={src} alt="" className="kilo-sky-img" style={{ opacity: skyOpacity(i, fill) }} />
      ))}
    </div>
  );
}

function KiloMeters({ result, t }: { result: KiloResult; t: number }) {
  const { tx } = useI18n();
  const mt = Math.min(1, Math.max(0, (t - 0.45) / 0.55));
  const ease = 1 - Math.pow(1 - mt, 3);
  const rows = [
    {
      emoji: "🌳",
      label: tx("Ağaç"),
      value: Math.round(result.trees * ease).toLocaleString("tr-TR"),
      unit: tx("ağaç yılı"),
      hint: tx("Bu izi soğurmak için bir ağacın çalışacağı yıl."),
    },
    {
      emoji: "🚗",
      label: tx("Binek"),
      value: Math.round(result.carKm * ease).toLocaleString("tr-TR"),
      unit: "km",
      hint: tx("Aynı karbon, bir binek otomobilin gideceği yol."),
    },
    {
      emoji: "✈️",
      label: tx("İç hat"),
      value: (result.flights * ease).toLocaleString("tr-TR", { maximumFractionDigits: 1 }),
      unit: tx("uçuş"),
      hint: tx("Kısa iç hat (İstanbul–Ankara civarı) uçuş karşılığı."),
    },
  ];
  return (
    <div className="kilo-eq">
      {rows.map((row) => (
        <div key={row.label} className="kilo-eq-card">
          <div className="kilo-eq-emoji" aria-hidden>{row.emoji}</div>
          <div className="kilo-eq-val">{row.value} <small>{row.unit}</small></div>
          <p>{row.hint}</p>
        </div>
      ))}
    </div>
  );
}

export function KiloScene({ result, large }: { result: KiloResult; large?: boolean }) {
  const { tx } = useI18n();
  const token = `${result.sex}-${result.age}-${result.heightCm}-${result.weightKg}-${result.tonnesTo2035}`;
  const t = useKiloClock(token, 7200);
  const year = Math.round(result.fromYear + (result.toYear - result.fromYear) * t);
  const shown = result.tonnesTo2035 * t;
  const done = t > 0.98;
  const cap = result.airLevel ?? 1;
  const tankFill = t * (result.airFill ?? cap / 5);
  const skyFill = t * ((cap - 1) / 4);
  const liveLevel = Math.max(1, Math.min(cap, Math.round(t * cap) || 1));

  return (
    <div className={`kilo-stage ${large ? "is-large" : ""} ${done ? "is-done" : "is-run"}`}>
      <div className="kilo-air">
        <AirSkies fill={skyFill} />
        <div className="kilo-tank-row">
          <Co2Tank fill={tankFill} level={liveLevel} large={large} />
          <div className="kilo-readout">
            <div className="kilo-year">{tx(result.sexLabel)} · {year} · {tx("BKİ")} {result.bmi}</div>
            <div className="kilo-ton display">{formatTonnes(Math.max(0, shown))}</div>
            <div className="kilo-cap">{result.fromYear}–{TARGET_YEAR} {tx("gıda izi")}</div>
          </div>
        </div>
        <KiloMeters result={result} t={t} />
      </div>
    </div>
  );
}

export function KiloFacts({ result }: { result: KiloResult }) {
  const { tx } = useI18n();
  return (
    <div className="space-y-3">
      <div className="card p-3">
        <BmiScale result={result} />
        <p className="text-sm mt-3" style={{ color: "#1c1917" }}>{tx(result.bmiNote)}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="card p-3">
          <div className="text-xs uppercase tracking-[0.14em] text-[#0077C2]">{tx("Yıllık")}</div>
          <div className="display text-3xl">{formatTonnes(result.tonnesYear)}</div>
          <p className="text-xs text-[#57534e]">~{result.kcalDay} kcal/{tx("gün")} · {tx(result.sexLabel)}</p>
        </div>
        <div className="card p-3">
          <div className="text-xs uppercase tracking-[0.14em] text-[#0077C2]">{tx("2035’e kadar")}</div>
          <div className="display text-3xl">{formatTonnes(result.tonnesTo2035)}</div>
          <p className="text-xs text-[#57534e]">{result.weightKg} kg · {result.heightCm} cm</p>
        </div>
      </div>
      <div className="card p-4 space-y-2">
        {result.savedTonnes > 0 ? (
          <p className="text-sm" style={{ color: "#22A34A" }}>
            {tx("Yeşil bant ortası")} (~{result.healthyWeightKg} kg) {tx("olsa iz")} ~{formatTonnes(result.healthyTonnesTo2035)} {tx("olurdu.")}
            {tx("Fark:")} <strong>{formatTonnes(result.savedTonnes)}</strong> {tx("daha az.")}
          </p>
        ) : null}
        <p className="text-xs text-[#57534e]">{tx("Kabaca gıda sistemi hesabıdır; ısınma, ulaşım ve tüketim ayrıdır. Pavilion eğitim aracıdır.")}</p>
      </div>
    </div>
  );
}

export function KiloPlay({
  slug,
  onPosted,
}: {
  slug: string;
  onPosted?: () => void;
}) {
  const { tx } = useI18n();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<KiloResult | null>(null);
  const [msg, setMsg] = useState("");

  async function run(sex: KiloSex, age: number, heightCm: number, weightKg: number) {
    setBusy(true);
    setMsg("");
    const local = estimateCarbon({ sex, age, heightCm, weightKg });
    setResult(local);
    try {
      const res = await fetch(`/api/public/games/${slug}/kilo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sex, age, heightCm, weightKg }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) setMsg(json.error || "Duvara gönderilemedi; hesap yine de sende.");
      else if (json.result) setResult(json.result);
      onPosted?.();
    } catch {
      setMsg("Bağlantı yok; hesap cihazda gösterildi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <KiloForm onSubmit={(s, a, h, w) => void run(s, a, h, w)} busy={busy} />
      {result ? (
        <>
          <KiloScene result={result} />
          <KiloFacts result={result} />
          <button className="btn ghost w-full justify-center" type="button" onClick={() => setResult(null)}>{tx("Yeni hesap")}</button>
        </>
      ) : null}
      {msg ? <p className="text-sm text-[#0077C2]">{tx(msg)}</p> : null}
    </div>
  );
}

export function KiloWallView({ kilo, large }: { kilo: KiloPublic | null; large?: boolean }) {
  const { tx } = useI18n();
  const latest = kilo?.latest || null;
  const shown = latest
    ? estimateCarbon({
        sex: latest.sex || "erkek",
        age: latest.age,
        heightCm: latest.heightCm,
        weightKg: latest.weightKg,
      })
    : null;

  return (
    <div className="space-y-4">
      {shown && latest ? (
        <>
          <KiloScene key={latest.id} result={shown} large={large} />
          {large ? (
            <div className="card p-4">
              <BmiScale result={shown} />
              <p className="text-sm mt-3">{tx(shown.bmiNote)}</p>
            </div>
          ) : null}
        </>
      ) : (
        <div className={`kilo-stage ${large ? "is-large" : ""} is-idle`}>
          <div className="kilo-air">
            <AirSkies fill={0} />
            <div className="kilo-tank-row">
              <Co2Tank fill={0} level={1} large={large} />
              <div className="kilo-readout">
                <div className="kilo-year">2026 → 2035</div>
                <div className="kilo-ton display">{tx("Karekodu okut")}</div>
                <div className="kilo-cap">{tx("Cinsiyet, yaş, boy, kilo")}</div>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="grid md:grid-cols-3 gap-3">
        <div className="p-4" style={{ background: "#EEF8FD", color: "#1c1917" }}>
          <div className="text-xs uppercase tracking-[0.14em] text-[#0077C2]">{tx("Son iz")}</div>
          <div className="display text-4xl">{latest ? formatTonnes(latest.tonnesTo2035) : "—"}</div>
          <p className="text-sm mt-1">{latest ? `BKİ ${latest.bmi} · ${TARGET_YEAR}’e kadar` : tx("Telefondan cinsiyet, yaş, boy, kilo girilsin.")}</p>
        </div>
        <div className="p-4" style={{ background: "#EEF8FD", color: "#1c1917" }}>
          <div className="text-xs uppercase tracking-[0.14em] text-[#0077C2]">{tx("Pavilion toplamı")}</div>
          <div className="display text-4xl">{formatTonnes(kilo?.totalTonnes || 0)}</div>
          <p className="text-sm mt-1">{kilo?.visitors || 0} {tx("ziyaretçi hesabı")}</p>
        </div>
        <div className="p-4" style={{ background: "#EEF8FD", color: "#1c1917" }}>
          <div className="text-xs uppercase tracking-[0.14em] text-[#0077C2]">{tx("Son BKİ")}</div>
          <div className="flex flex-wrap gap-2 mt-2">
            {(kilo?.pulses || []).slice(0, 6).map((p) => (
              <span key={p.id} className="px-2 py-1 text-sm" style={{ background: "#0088C8", color: "#EEF8FD" }}>
                {p.sex === "kadin" ? "K" : "E"} {p.bmi} · {formatTonnes(p.tonnesTo2035)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
