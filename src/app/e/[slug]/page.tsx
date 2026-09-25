"use client";

import { use, useState } from "react";
import { api, useApi } from "@/lib/client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useI18n } from "@/components/I18nProvider";

type EventPayload = {
  slug: string;
  title: string;
  type: string;
  companyName: string;
  topic: string;
  location: string;
  description: string;
  gift: string;
  config: {
    questions?: { q: string; options: string[] }[];
    steps?: { title: string; body: string }[];
    slices?: { label: string; prize: string; color: string }[];
  };
};

function Play({ slug }: { slug: string }) {
  const { tx } = useI18n();
  const params = useSearchParams();
  const elci = params.get("elci") || "";
  const { data } = useApi<EventPayload>(`/api/public/events/${slug}`);
  const [who, setWho] = useState({ fullName: "", email: "", phone: "", organization: "", city: "", visitorType: "Ziyaretçi" });
  const [answers, setAnswers] = useState<number[]>([]);
  const [survey, setSurvey] = useState<string[]>([]);
  const [step, setStep] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [deg, setDeg] = useState(0);
  const [result, setResult] = useState<{ prize: string; score?: number } | null>(null);
  const [error, setError] = useState("");
  const [signupId, setSignupId] = useState("");
  const [phase, setPhase] = useState<"register" | "play">("register");

  const slices = data?.config.slices || [];
  const sliceAngle = slices.length ? 360 / slices.length : 60;
  const isQa = data?.type === "gift-qa" || data?.type === "quiz";

  async function submit(extra: Record<string, unknown> = {}) {
    setError("");
    if (isQa) {
      const qs = data?.config.questions || [];
      if (qs.some((_, i) => typeof answers[i] !== "number")) {
        setError("Tüm soruları yanıtlayın");
        return null;
      }
    }
    try {
      const res = await api<{ prize: string; score: number }>("/api/public/signup", {
        method: "POST",
        body: JSON.stringify({ slug, ...who, elci, answers, survey, signupId, step: isQa ? "play" : undefined, ...extra }),
      });
      setResult({ prize: res.prize, score: res.score });
      return res;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kayıt alınamadı");
      return null;
    }
  }

  async function registerAndPlay() {
    setError("");
    if (!who.fullName.trim() || !who.email.includes("@")) {
      setError("Ad ve geçerli e-posta gerekli");
      return;
    }
    try {
      const res = await api<{ id: string; alreadyPlayed?: boolean; prize?: string; score?: number }>("/api/public/signup", {
        method: "POST",
        body: JSON.stringify({ slug, ...who, elci, step: "register" }),
      });
      setSignupId(res.id);
      if (res.alreadyPlayed) {
        setResult({ prize: res.prize || "", score: res.score });
        return;
      }
      setPhase("play");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kayıt alınamadı");
    }
  }

  async function spin() {
    if (spinning || !data) return;
    setSpinning(true);
    const res = await submit();
    const idx = Math.max(0, slices.findIndex((s) => s.prize === res?.prize));
    const target = 360 * 6 + (360 - idx * sliceAngle - sliceAngle / 2);
    setDeg(target);
    setTimeout(() => setSpinning(false), 4200);
  }

  if (!data) return <p className="p-8">{tx("Yükleniyor…")}</p>;
  if (result && data.type !== "wheel") {
    return (
      <Done title={data.title} prize={result.prize} score={result.score} backHref={slug.startsWith("solaklar-") ? "/solaklar" : "/p"} />
    );
  }

  return (
    <main className="min-h-screen bg-[#EEF8FD]">
      <header className="px-5 py-6 text-[#EEF8FD]" style={{ background: "#0088C8" }}>
        <a href={data.slug.startsWith("solaklar-") ? "/solaklar" : "/p"} className="text-xs underline opacity-80">
          {data.slug.startsWith("solaklar-") ? tx("← Solaklar outdoor") : tx("← Açık program")}
        </a>
        <p className="text-xs tracking-[0.18em] uppercase mt-2 opacity-80">{tx(data.companyName)}</p>
        <h1 className="display text-3xl mt-1">{tx(data.title)}</h1>
        <p className="text-[#C8EEFA] text-sm mt-1">{tx(data.location)} · {tx(data.topic)}</p>
        {elci ? <p className="text-xs mt-2">{tx("Elçi kaydı:")} {elci}</p> : null}
      </header>
      <div className="max-w-lg mx-auto p-5 space-y-4">
        <p>{tx(data.description)}</p>
        <p className="text-sm text-[#0077C2]">{tx("Hediye:")} {tx(data.gift)}</p>
        {(!isQa || phase === "register") && (
          <div className="card p-4 grid gap-2">
            <h2 className="font-semibold">{tx("Katılımcı kaydı")}</h2>
            {isQa ? <p className="text-sm text-[#3E6A88]">{tx("Önce kayıt olun. Kayıt sonrası sorular açılır.")}</p> : null}
            <input className="field" placeholder={tx("Ad soyad *")} value={who.fullName} onChange={(e) => setWho({ ...who, fullName: e.target.value })} />
            <input className="field" placeholder={tx("E-posta *")} type="email" value={who.email} onChange={(e) => setWho({ ...who, email: e.target.value })} />
            <input className="field" placeholder={tx("Telefon")} value={who.phone} onChange={(e) => setWho({ ...who, phone: e.target.value })} />
            <input className="field" placeholder={tx("Kurum")} value={who.organization} onChange={(e) => setWho({ ...who, organization: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <input className="field" placeholder={tx("Şehir")} value={who.city} onChange={(e) => setWho({ ...who, city: e.target.value })} />
              <select className="field" value={who.visitorType} onChange={(e) => setWho({ ...who, visitorType: e.target.value })}>
                <option value="Ziyaretçi">{tx("Ziyaretçi")}</option>
                <option value="Öğrenci">{tx("Öğrenci")}</option>
                <option value="Uzman">{tx("Uzman")}</option>
                <option value="Medya">{tx("Medya")}</option>
                <option value="Firma">{tx("Firma")}</option>
              </select>
            </div>
            {isQa ? (
              <button className="btn w-full justify-center mt-1" onClick={() => void registerAndPlay()}>
                {tx("Kayıt ol ve oyuna başla")}
              </button>
            ) : null}
          </div>
        )}

        {isQa && phase === "play" && (
          <div className="card p-4 space-y-3">
            <p className="text-sm text-[#0077C2]">{tx("Kayıt alındı.")} {who.fullName} · {tx("Soruları yanıtlayın.")}</p>
            {(data.config.questions || []).map((q, i) => (
              <div key={q.q}>
                <div className="text-sm font-semibold">{i + 1}. {tx(q.q)}</div>
                <div className="mt-1 space-y-1">
                  {q.options.map((o, oi) => (
                    <button
                      type="button"
                      key={o}
                      className={`block w-full text-left px-2 py-1 border ${answers[i] === oi ? "bg-[#0077C2] text-white border-[#0077C2]" : "border-[#B5DFF2] bg-white"}`}
                      onClick={() => {
                        const next = [...answers];
                        next[i] = oi;
                        setAnswers(next);
                      }}
                    >
                      {tx(o)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button className="btn w-full justify-center" onClick={() => void submit()}>{tx("Gönder ve hediyeyi gör")}</button>
          </div>
        )}

        {data.type === "survey" && (
          <div className="card p-4 space-y-3">
            {(data.config.questions || []).map((q, i) => (
              <div key={q.q}>
                <div className="text-sm font-semibold">{tx(q.q)}</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {q.options.map((o) => (
                    <button
                      type="button"
                      key={o}
                      className={`px-2 py-1 border text-sm ${survey[i] === o ? "bg-[#0077C2] text-white border-[#0077C2]" : "border-[#B5DFF2] bg-white"}`}
                      onClick={() => {
                        const next = [...survey];
                        next[i] = o;
                        setSurvey(next);
                      }}
                    >
                      {tx(o)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button className="btn w-full justify-center" onClick={() => void submit({ survey })}>{tx("Anketi kaydet")}</button>
          </div>
        )}

        {data.type === "wheel" && (
          <div className="card p-4 text-center">
            {result ? <Done title={data.title} prize={result.prize} compact backHref={slug.startsWith("solaklar-") ? "/solaklar" : "/p"} /> : (
              <>
                <div className="relative mx-auto w-64 h-64">
                  <div className="absolute left-1/2 -top-2 z-10 -translate-x-1/2 text-[#0077C2]">▼</div>
                  <div
                    className="w-64 h-64 rounded-full border-[6px] border-[#0088C8]"
                    style={{
                      background: `conic-gradient(${slices.map((s, i) => `${s.color} ${i * sliceAngle}deg ${(i + 1) * sliceAngle}deg`).join(",")})`,
                      transform: `rotate(${deg}deg)`,
                      transition: spinning ? "transform 4s cubic-bezier(.15,.85,.2,1)" : "none",
                    }}
                  />
                </div>
                <button className="btn mt-4" disabled={spinning} onClick={() => void spin()}>{spinning ? tx("Çevriliyor…") : tx("Çarkı çevir")}</button>
              </>
            )}
          </div>
        )}

        {data.type === "interactive" && (
          <div className="card p-4">
            {data.config.steps?.[step] ? (
              <>
                <h3 className="display text-2xl">{tx(data.config.steps[step].title)}</h3>
                <p className="mt-2">{tx(data.config.steps[step].body)}</p>
                <button
                  className="btn mt-4"
                  onClick={() => {
                    if (step + 1 >= (data.config.steps?.length || 0)) void submit();
                    else setStep(step + 1);
                  }}
                >
                  {step + 1 >= (data.config.steps?.length || 0) ? tx("Bitir ve kaydol") : tx("İleri")}
                </button>
              </>
            ) : null}
          </div>
        )}
        {error ? <p className="text-sm text-[#0077C2]">{tx(error)}</p> : null}
      </div>
    </main>
  );
}

function Done({ title, prize, score, compact, backHref = "/p" }: { title: string; prize: string; score?: number; compact?: boolean; backHref?: string }) {
  const { tx } = useI18n();
  return (
    <div className={compact ? "" : "max-w-lg mx-auto p-8 card mt-8"}>
      <h2 className="display text-3xl">{tx("Teşekkürler")}</h2>
      <p className="mt-2">{tx(title)} {tx("kaydınız alındı.")}</p>
      {typeof score === "number" ? <p>{tx("Puan:")} {score}</p> : null}
      <p className="text-[#0077C2] mt-2 font-semibold">{prize ? `${tx("Hediye:")} ${tx(prize)}` : tx("Katılımınız not edildi.")}</p>
      <a className="btn mt-4 inline-flex" href={backHref}>{backHref === "/solaklar" ? tx("Solaklar programına dön") : tx("Programa dön")}</a>
    </div>
  );
}

export default function EventPublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return (
    <Suspense>
      <Play slug={slug} />
    </Suspense>
  );
}
