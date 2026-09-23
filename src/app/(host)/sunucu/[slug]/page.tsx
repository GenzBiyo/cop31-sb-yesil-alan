"use client";

import { use, useEffect, useRef, useState } from "react";
import { api, useApi, useRealtime } from "@/lib/client";
import { useI18n } from "@/components/I18nProvider";
import { NameList, Scoreboard, TimerRing } from "@/components/game/Board";
import { QrImage } from "@/components/QrImage";
import { QuestionOptions, QuestionVideo } from "@/components/game/QuestionMedia";
import { PrizeWheel, useWheelMotion, WheelSpinButtons } from "@/components/game/PrizeWheel";
import { describeWheel, sliceKindLabel } from "@/lib/wheel";
import { TouchMeters, TouchScene } from "@/components/game/TouchWorld";
import { SolvedChips } from "@/components/game/MatchPlay";
import { KiloWallView } from "@/components/game/KiloPlay";
import type { KiloPublic } from "@/lib/kilo-live";
import { HatiraWallView } from "@/components/game/HatiraPlay";
import type { HatiraPublic } from "@/lib/hatira";

type Person = { id: string; nickname: string; teamName: string };
type HostGame = {
  id: string;
  slug: string;
  title: string;
  status: string;
  phase: string;
  view: string;
  type?: string;
  currentIndex: number;
  seconds: number;
  remaining: number;
  paused: boolean;
  questionStartedAt?: string | null;
  spinAngle?: number;
  wheelMode?: "idle" | "coast" | "stop";
  spinFrom?: number;
  slices?: { id: string; label: string; color: string; kind: string }[];
  spinPlayer?: { id: string; nickname: string } | null;
  landed?: { label: string; kind: string; color: string } | null;
  match?: { mode: string; meters: { clean: number; health: number; joy: number }; bloom: boolean; solved: string[]; totalPairs: number } | null;
  kilo?: KiloPublic | null;
  hatira?: HatiraPublic | null;
  questions: { id: string; prompt: string }[];
  current: { id: string; index: number; prompt: string; options: string[]; points: number; answer: number | null; seconds?: number; videoUrl?: string; videoPath?: string } | null;
  results: { correct: Person[]; wrong: Person[]; unanswered: Person[]; answered: number; total: number } | null;
  pending: { id: string; nickname: string; photoPath?: string }[];
  roster: { id: string; nickname: string; score: number }[];
  board: {
    players: { id: string; rank: number; nickname: string; teamName: string; score: number; winner: boolean }[];
    teams: { name: string; color: string; score: number; members: number }[];
  };
};

function Host({ slug }: { slug: string }) {
  const { data, reload, error } = useApi<HostGame>(`/api/games?slug=${encodeURIComponent(slug)}`);
  const { tx, t } = useI18n();
  const [left, setLeft] = useState(0);
  const [msg, setMsg] = useState("");
  const [pick, setPick] = useState("");
  const busyRef = useRef(false);

  useRealtime((t) => {
    if (t === "game") void reload(true);
  });

  useEffect(() => {
    const tick = () => {
      if (document.hidden) return;
      void reload();
    };
    const t = setInterval(tick, 10000);
    return () => clearInterval(t);
  }, [reload]);

  useEffect(() => {
    setLeft(data?.remaining ?? 0);
  }, [data?.remaining, data?.currentIndex, data?.phase]);

  useEffect(() => {
    if (data?.phase !== "asking" || data.paused) return;
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [data?.phase, data?.paused, data?.currentIndex]);

  useEffect(() => {
    if (left === 0 && data?.phase === "asking" && !data.paused) void reload();
  }, [left, data?.phase, data?.paused, reload]);

  const wheel = describeWheel(data || {});
  const wheelAngle = useWheelMotion(wheel);

  async function moderate(playerId: string, action: "approve" | "reject") {
    if (!data) return;
    await api(`/api/games/${data.id}/players`, { method: "POST", body: JSON.stringify({ playerId, action }) });
    await reload();
  }

  async function run(action: string, extra: Record<string, unknown> = {}) {
    if (!data || busyRef.current) return;
    busyRef.current = true;
    setMsg("");
    try {
      await api(`/api/games/${data.id}/run`, { method: "POST", body: JSON.stringify({ action, ...extra }) });
      await reload(true);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Komut alınamadı");
    } finally {
      busyRef.current = false;
    }
  }

  if (!data && !error) return <p className="p-8 cop-wall text-[#EEF8FD] min-h-screen">{tx("Sunucu ekranı yükleniyor…")}</p>;
  if (error || !data) {
    const login = error?.includes("Oturum") || error?.includes("Yetkiniz");
    return (
      <main className="cop-wall min-h-screen p-8 text-[#EEF8FD]">
        <p className="text-xs tracking-[0.18em] uppercase opacity-80">COP31 · Sunucu</p>
        <h1 className="display text-4xl mt-2">Yeşil Dokunuş</h1>
        <p className="mt-3 text-[#C8EEFA]">{error || "Oyun yok"}</p>
        {login ? (
          <a className="btn mt-5 inline-flex" href={`/giris/bakanlik?next=/sunucu/${slug}`}>
            {tx("Bakanlık hesabıyla gir")}
          </a>
        ) : null}
      </main>
    );
  }

  const reveal = data.phase === "reveal" || data.phase === "closed";
  const boardMode = data.view === "board" || data.phase === "closed";
  const qn = data.currentIndex >= 0 ? data.currentIndex + 1 : 0;
  const isWheel = data.type === "wheel";
  const isMatch = data.type === "match";
  const isKilo = data.type === "kilo";
  const isHatira = data.type === "hatira";
  const quizLast = data.questions.length > 0 && data.currentIndex + 1 >= data.questions.length;
  const quizClosed = data.phase === "closed";
  const quizPrimary =
    quizClosed || data.phase === "lobby" || data.currentIndex < 0
      ? { action: quizClosed ? "restart" : "start", label: quizClosed ? "Yeniden başlat" : "Oyunu başlat" }
      : data.paused
        ? { action: "resume", label: "Devam" }
        : data.phase === "reveal"
          ? { action: "next", label: quizLast ? "Yarışmayı bitir" : "Sonraki soru" }
          : { action: "start", label: "Soruyu başlat" };

  return (
    <main className="on-dark cop-wall min-h-screen text-[#EEF8FD]">
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 px-5 py-4" style={{ background: "#00A3E0" }}>
        <div>
          <a href={`/oyunlar/${data.id}`} className="text-xs underline" style={{ color: "#EEF8FD" }}>← {isWheel ? "Dilimleri düzenle" : isMatch || isKilo || isHatira ? "Tur ayarı" : "Soru düzenle"}</a>
          <a href={`/oyun/${data.slug}`} className="text-xs underline ml-3" style={{ color: "#EEF8FD" }} target="_blank">Duvar ekranı</a>
          <h1 className="display text-3xl mt-1">{data.title}</h1>
          <p className="text-xs tracking-[0.16em] uppercase opacity-80">
            Sunucu · {data.phase} · {isWheel ? `${(data.slices || []).length} dilim` : isHatira ? "hatıra" : isKilo ? "kilo karbon" : isMatch ? (data.currentIndex === 1 ? "eşleştirme" : data.currentIndex === 0 ? "hafıza" : "lobi") : `soru ${qn}/${data.questions.length}`}
            {data.paused ? " · DURDU" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn ghost" onClick={() => void run("lobby")}>{tx("Lobiye al")}</button>
          {isHatira || isKilo ? (
            <span className="text-xs tracking-[0.14em] uppercase opacity-80">Telefondan giriş açık</span>
          ) : isMatch ? (
            <>
              <button className="btn" onClick={() => void run("memory")}>Hafızayı başlat</button>
              <button className="btn ghost" onClick={() => void run("pairs")}>Eşleştirmeyi başlat</button>
              <button className="btn ghost" onClick={() => void run("reveal")} disabled={data.phase !== "asking"}>Süre bitsin</button>
              <button className="btn ghost" onClick={() => void run("next")} disabled={data.phase === "lobby"}>
                {data.currentIndex >= 1 ? "Oyunu bitir" : "Eşleştirmeye geç"}
              </button>
              <button className="btn ghost" onClick={() => void run(boardMode ? "question" : "board")}>
                {boardMode ? "Sahneye dön" : "Puan tablosu"}
              </button>
            </>
          ) : isWheel ? (
            <>
              <button
                className="btn"
                onClick={() => void run("spin", { playerId: pick, fromAngle: Math.round(wheelAngle) })}
                disabled={wheel.mode !== "idle"}
              >
                {wheel.mode === "idle" ? "Çarkı çevir" : wheel.mode === "coast" ? "Dönüyor…" : "Duruyor…"}
              </button>
              <button
                className="btn secondary"
                onClick={() => void run("stop", { fromAngle: Math.round(wheelAngle) })}
                disabled={wheel.mode !== "coast"}
              >
                Durdur
              </button>
            </>
          ) : (
            <>
          <button
            className="btn"
            onClick={() => void run(quizPrimary.action)}
            disabled={data.phase === "asking" && !data.paused}
          >
            {tx(quizPrimary.label)}
          </button>
          <button className="btn secondary" onClick={() => void run("stop")} disabled={data.phase !== "asking" || data.paused}>{tx("Durdur")}</button>
          <button className="btn ghost" onClick={() => void run("reveal")} disabled={data.phase !== "asking"}>{tx("Süre bitsin")}</button>
          <button className="btn ghost" onClick={() => void run("next")} disabled={data.phase === "lobby" || quizClosed || data.questions.length === 0}>
            {quizLast ? tx("Yarışmayı bitir") : tx("Sonraki soru")}
          </button>
          <button className="btn ghost" onClick={() => void run("restart")} disabled={data.phase === "lobby" && data.currentIndex < 0}>
            {tx("Yeniden başlat")}
          </button>
          <button className="btn ghost" onClick={() => void run(data.view === "board" ? "question" : "board")}>
            {data.view === "board" ? tx("Soruya dön") : tx("Puan tablosu")}
          </button>
            </>
          )}
        </div>
      </header>

      <div className="grid lg:grid-cols-[1fr_280px] gap-4 p-5">
        <section className="space-y-4">
          {boardMode ? (
            <div className="p-6" style={{ background: "#EEF8FD", color: "#1c1917" }}>
              <h2 className="display text-4xl">{data.phase === "closed" ? tx("Yarışma bitti") : tx("Puan tablosu")}</h2>
              {data.phase === "closed" ? (
                <p className="mt-2 text-sm">{tx("Yeniden başlat deyince puanlar sıfırlanır, 5 soru baştan açılır. Rumuzlar kalır.")}</p>
              ) : null}
              <div className="mt-4">
                <Scoreboard players={data.board.players} teams={data.board.teams} />
              </div>
            </div>
          ) : (
            <div className="p-6" style={{ background: "#0088C8" }}>
              {isHatira ? (
                <div>
                  <h2 className="display text-4xl">COP31 Hatıra</h2>
                  <p className="mt-2 text-[#C8EEFA]">Onayladığınız selfieler duvar ekranında görünür. Altında Teşekkür ederiz yazılır.</p>
                  <div className="mt-6">
                    <HatiraWallView hatira={data.hatira || null} />
                  </div>
                </div>
              ) : isKilo ? (
                <div>
                  <h2 className="display text-4xl">Kilo Karbon</h2>
                  <p className="mt-2 text-[#C8EEFA]">Ziyaretçi yaş, boy, kilo girince 2035’e kadar gıda izi duvarda canlanır.</p>
                  <div className="mt-6">
                    <KiloWallView kilo={data.kilo || null} />
                  </div>
                </div>
              ) : isMatch ? (
                <div>
                  <h2 className="display text-4xl">{data.currentIndex === 1 ? "Eşleştirme" : data.phase === "asking" ? "Hafıza" : "Yeşil Dokunuş"}</h2>
                  <p className="mt-2 text-[#C8EEFA]">Oyuncular telefonlarından dokunur. Doğru eşleşmeye 10 puan.</p>
                  {data.phase === "asking" ? <p className="display text-6xl mt-4">{left}</p> : <p className="mt-4 display text-5xl">{data.board.players.length} oyuncu</p>}
                  <div className="mt-6 p-4 space-y-4" style={{ background: "#EEF8FD", color: "#1c1917" }}>
                    <TouchScene meters={data.match?.meters || { clean: 18, health: 16, joy: 14 }} bloom={data.match?.bloom} />
                    <TouchMeters meters={data.match?.meters || { clean: 18, health: 16, joy: 14 }} />
                    <SolvedChips solved={data.match?.solved || []} />
                  </div>
                </div>
              ) : isWheel ? (
                <div className="grid lg:grid-cols-[minmax(240px,1fr)_280px] gap-6 items-center">
                  <div className="flex justify-center">
                    <PrizeWheel
                      slices={data.slices || []}
                      angle={wheelAngle}
                      size={360}
                      spinning={wheel.mode !== "idle"}
                      mode={wheel.mode}
                      highlight={reveal ? data.currentIndex : null}
                    />
                  </div>
                  <div>
                    <h2 className="display text-4xl">Hediyeli çark</h2>
                    <p className="mt-2 text-[#C8EEFA]">
                      {wheel.mode === "coast"
                        ? `${data.spinPlayer ? data.spinPlayer.nickname + " çeviriyor." : "Çark dönüyor."} Durdur deyince yavaşlar.`
                        : wheel.mode === "stop"
                          ? "Çark yavaş yavaş duruyor."
                          : data.spinPlayer
                            ? `Sıra: ${data.spinPlayer.nickname}`
                            : "Oyuncu telefondan Çevir’e basar. İsterseniz buradan da çevirebilirsiniz."}
                    </p>
                    <div className="mt-4 max-w-xs">
                      <WheelSpinButtons
                        mode={wheel.mode}
                        canSpin={wheel.mode === "idle"}
                        canStop={wheel.mode === "coast"}
                        onSpin={() => void run("spin", { playerId: pick, fromAngle: Math.round(wheelAngle) })}
                        onStop={() => void run("stop", { fromAngle: Math.round(wheelAngle) })}
                      />
                    </div>
                    {reveal && data.landed ? (
                      <div className="mt-4 p-4" style={{ background: data.landed.color }}>
                        <div className="text-xs tracking-[0.16em] uppercase opacity-80">{sliceKindLabel(data.landed.kind)}</div>
                        <div className="display text-4xl mt-1">{data.landed.label}</div>
                        {data.spinPlayer ? <p className="mt-2">{data.spinPlayer.nickname}</p> : null}
                      </div>
                    ) : null}
                    <label className="block text-sm mt-4">Bu tur kimin için
                      <select className="field mt-1" value={pick} onChange={(e) => setPick(e.target.value)}>
                        <option value="">Rastgele onaylı rumuz</option>
                        {(data.roster || []).map((p) => (
                          <option key={p.id} value={p.id}>{p.nickname}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              ) : data.phase === "closed" ? (
                <div>
                  <h2 className="display text-4xl">Yarışma bitti</h2>
                  <p className="mt-2 text-[#C8EEFA]">Puan tablosu duvarda. Yeniden başlatınca aynı oyuncularla 5 soru sıfırdan açılır.</p>
                </div>
              ) : data.phase === "lobby" ? (
                <div>
                  <h2 className="display text-4xl">{tx("Lobi")}</h2>
                  <p className="mt-2 text-[#C8EEFA]">{tx("Oyuncular karekodla giriyor. Başlatınca her soru kendi süresiyle açılır (varsayılan 15 sn).")}</p>
                  <p className="mt-4 display text-5xl">{data.board.players.length} oyuncu</p>
                </div>
              ) : data.current ? (
                <>
                  <div className="text-xs tracking-[0.2em] uppercase text-[#C8EEFA]">
                    Soru {data.current.index + 1} / {data.questions.length} · {data.current.points} puan · {data.seconds} sn
                  </div>
                  {data.phase === "asking" ? (
                    <div className="mt-3">
                      <TimerRing remaining={left} total={data.seconds} />
                    </div>
                  ) : null}
                  <div className="mt-4">
                    <QuestionVideo url={data.current.videoUrl} path={data.current.videoPath} title={data.current.prompt} compact />
                  </div>
                  <h2 className="display text-4xl md:text-6xl leading-tight mt-4">{tx(data.current.prompt)}</h2>
                  <div className="mt-6">
                    <QuestionOptions options={data.current.options} correctIndex={data.current.answer} reveal={reveal} />
                  </div>
                  <p className="mt-3 text-sm text-[#C8EEFA]">
                    {data.results?.answered || 0} / {data.results?.total || 0} yanıt
                  </p>
                </>
              ) : (
                <h2 className="display text-4xl">Yarışma bitti</h2>
              )}
            </div>
          )}

          {reveal && !boardMode && !isWheel && !isMatch && !isKilo && !isHatira && data.results ? (
            <div className="p-5 space-y-4" style={{ background: "#EEF8FD", color: "#1c1917" }}>
              <h3 className="display text-3xl">{tx("Bu soruyu kim doğru işaretledi?")}</h3>
              <NameList title={tx("Doğru")} tone="ok" people={data.results.correct} />
              <NameList title={tx("Yanlış")} tone="bad" people={data.results.wrong} />
              <NameList title={tx("Yanıtlamayan")} tone="muted" people={data.results.unanswered} />
              <h3 className="display text-2xl mt-4">{tx("Puan tablosu")}</h3>
              <Scoreboard players={data.board.players} teams={data.board.teams} />
            </div>
          ) : null}
          {msg ? <p className="text-[#C8EEFA]">{msg}</p> : null}
        </section>

        <aside className="space-y-3">
          <div className="p-3 text-center" style={{ background: "#EEF8FD" }}>
            <QrImage path={`/oyun/${data.slug}/katil`} alt="Oyuncu QR" size={160} />
            <p className="text-xs text-[#57534e] mt-2">{tx("Telefon giriş karekodu")}</p>
          </div>
          <div className="p-3" style={{ background: "#0088C8" }}>
            <div className="text-xs tracking-[0.16em] uppercase opacity-70">{isHatira ? tx("Hatıra onayları") : tx("Rumuz onayları")} · {(data.pending || []).length}</div>
            <div className="mt-2 space-y-2">
              {(data.pending || []).length === 0 ? <p className="text-sm opacity-70">{isHatira ? tx("Bekleyen hatıra yok.") : tx("Bekleyen rumuz yok.")}</p> : null}
              {(data.pending || []).map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2">
                  {p.photoPath ? <img src={p.photoPath} alt={p.nickname} className="hatira-thumb" /> : null}
                  <span className="font-semibold flex-1">{p.nickname}</span>
                  <span className="flex gap-1">
                    <button className="btn" onClick={() => void moderate(p.id, "approve")}>{tx("Onayla")}</button>
                    <button className="btn ghost" onClick={() => void moderate(p.id, "reject")}>{tx("Reddet")}</button>
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="p-3" style={{ background: "#0088C8" }}>
            <div className="text-xs tracking-[0.16em] uppercase opacity-70">{tx("Puanlar")}</div>
            <div className="mt-3">
              <Scoreboard players={data.board.players} variant="compact" tone="dark" />
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

export default function HostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return <Host slug={slug} />;
}
