"use client";

import { FormEvent, use, useEffect, useState } from "react";
import { api, useApi, useGameLive } from "@/lib/client";
import { TimerRing } from "@/components/game/Board";
import { QuestionVideo } from "@/components/game/QuestionMedia";
import { PrizeWheel, useWheelMotion, WheelSpinButtons } from "@/components/game/PrizeWheel";
import { describeWheel, sliceKindLabel } from "@/lib/wheel";
import { MatchPlay } from "@/components/game/MatchPlay";
import { TouchMeters } from "@/components/game/TouchWorld";
import { KiloPlay } from "@/components/game/KiloPlay";
import { HatiraPlay } from "@/components/game/HatiraPlay";
import type { PlayerMatchView } from "@/lib/match-live";
import type { HatiraLogos } from "@/lib/hatira";
import { GameStage } from "@/components/game/GameStage";
import { PlakPlayer, PlakReel, type PlakTrack } from "@/components/game/PlakPlay";
import { ShareBar } from "@/components/game/ShareBar";
import { useI18n } from "@/components/I18nProvider";

type Payload = {
  slug: string;
  title: string;
  phase: string;
  view: string;
  type?: string;
  currentIndex?: number;
  total: number;
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
  question: { id: string; index: number; prompt: string; options: string[]; points: number; correctIndex: number | null; videoUrl?: string; videoPath?: string } | null;
  me: {
    id?: string;
    nickname: string;
    score: number;
    status: string;
    choice: number | null;
    correct: boolean | null;
    answered: boolean;
    winner?: boolean;
  } | null;
  match?: { mode: string; meters: { clean: number; health: number; joy: number }; bloom: boolean; solved: string[]; totalPairs: number } | null;
  matchBoard?: PlayerMatchView | null;
  logos?: HatiraLogos | null;
  plak?: { tracks: PlakTrack[]; spinning: boolean; startedAt: string | null; index: number } | null;
};

function MatchPhone({
  slug,
  view,
  onReload,
}: {
  slug: string;
  view: PlayerMatchView;
  onReload: () => Promise<void> | void;
}) {
  const [board, setBoard] = useState(view);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setBoard(view);
  }, [view]);

  async function send(body: Record<string, string>) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await api<{ view: PlayerMatchView; gained: number }>(`/api/public/games/${slug}/match`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setBoard(res.view);
      if (res.view.last === "bad") setTimeout(() => void onReload(), 900);
      else if (res.gained) void onReload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <MatchPlay
      view={board}
      locked={busy}
      onFlip={(id) => void send({ action: "flip", cardId: id })}
      onPick={(side, id) => void send({ action: "pick", side, itemId: id })}
    />
  );
}

function Join({ slug }: { slug: string }) {
  const { tx, t } = useI18n();
  const { data, error, reload } = useApi<Payload>(`/api/public/games/${slug}?play=1`);
  const [nickname, setNickname] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);

  useGameLive(reload, 12000);

  useEffect(() => {
    setLeft(data?.remaining ?? 0);
  }, [data?.remaining, data?.question?.id, data?.phase, data?.currentIndex]);

  useEffect(() => {
    setPicked(data?.me?.choice ?? null);
  }, [data?.question?.id, data?.me?.choice]);

  useEffect(() => {
    if (data?.phase !== "asking" || data.paused) return;
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [data?.phase, data?.paused, data?.question?.id, data?.currentIndex]);

  useEffect(() => {
    if (left === 0 && data?.phase === "asking" && !data.paused) void reload();
  }, [left, data?.phase, data?.paused, reload]);

  const wheel = describeWheel(data || {});
  const wheelAngle = useWheelMotion(wheel);

  async function spinWheel(action: "spin" | "stop") {
    if (busy) return;
    setBusy(true);
    setMsg("");
    try {
      await api(`/api/public/games/${slug}/spin`, {
        method: "POST",
        body: JSON.stringify({ action, fromAngle: Math.round(wheelAngle) }),
      });
      await reload();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Çark çevrilemedi");
    } finally {
      setBusy(false);
    }
  }

  async function join(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      await api(`/api/public/games/${slug}/join`, { method: "POST", body: JSON.stringify({ nickname }) });
      setNickname("");
      await reload();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Giriş alınamadı");
    } finally {
      setBusy(false);
    }
  }

  async function answer(choice: number) {
    if (!data?.question || busy || data.me?.answered || picked != null) return;
    setPicked(choice);
    setBusy(true);
    setMsg("");
    try {
      await api(`/api/public/games/${slug}/answer`, {
        method: "POST",
        body: JSON.stringify({ questionId: data.question.id, choice }),
      });
      await reload();
    } catch (err) {
      setPicked(null);
      setMsg(err instanceof Error ? err.message : "Yanıt gönderilemedi");
    } finally {
      setBusy(false);
    }
  }

  if (!data && !error) return <p className="p-8">{tx("Yükleniyor…")}</p>;
  if (error || !data) return <p className="p-8 text-[#0077C2]">{tx(error || "Oyun yok")}</p>;

  if (data.type === "hatira") {
    return (
      <GameStage
        kicker="COP31 Türkiye · Hatıra / Souvenir"
        title={data.title}
        lead="Selfie çekin. Hazırla deyince Antalya doğası ve COP31 fonu gelir."
      >
        <HatiraPlay slug={slug} logos={data.logos} />
      </GameStage>
    );
  }

  if (data.type === "kilo") {
    return (
      <GameStage
        kicker="COP31 · Etkileşim"
        title={data.title}
        lead="Cinsiyet, yaş, boy ve kilonu gir. BKİ tablosu ve 2035 gıda izi."
      >
        <KiloPlay slug={slug} />
      </GameStage>
    );
  }

  const status = data.me?.status;
  const reveal = data.phase === "reveal" || data.phase === "closed";

  return (
    <GameStage
      live={data.phase === "asking" || data.wheelMode === "coast" || data.wheelMode === "stop"}
      kicker="COP31 · Etkileşim"
      title={data.title}
      lead="Rumuzunu yaz. Admin onaylayınca duvarda görünürsün."
    >
      <div className="space-y-4">
        {!data.me || status === "rejected" ? (
          <form className="game-panel space-y-3" onSubmit={(e) => void join(e)}>
            {status === "rejected" ? (
              <div className="p-3 text-sm" style={{ background: "#FAD4D6" }}>
                {tx("Rumuzun onaylanmadı.")} <strong>{tx("Rumuzu değiştir")}</strong> {tx("ve yeniden gönder.")}
              </div>
            ) : null}
            <h2 className="display text-2xl">{tx("Rumuz seç")}</h2>
            <input className="field" placeholder={tx("Rumuz (ör. Zeytin)")} value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={20} required />
            <button className="btn w-full justify-center" disabled={busy}>{busy ? tx("Gönderiliyor…") : status === "rejected" ? tx("Yeni rumuz gönder") : tx("Katıl")}</button>
          </form>
        ) : null}

        {status === "pending" ? (
          <div className="game-panel">
            <h2 className="display text-3xl">{data.me?.nickname}</h2>
            <p className="mt-2">{tx("Admin rumuzunu onaylasın bekleniyor. Duvar ekranında henüz görünmezsin.")}</p>
          </div>
        ) : null}

        {status === "approved" ? (
          <>
            <div className="game-panel flex justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.14em] text-[#0077C2]">{tx("Oyuncu")}</div>
                <div className="display text-3xl">{data.me?.nickname}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-[#57534e]">{tx("Puan")}</div>
                <div className="display text-4xl text-[#0077C2]">{data.me?.score}</div>
              </div>
            </div>

            {data.phase === "lobby" ? (
              <div className="game-panel">
                {data.type === "wheel"
                  ? tx("Onaylandın. Çevir’e bas; çark dönünce Durdur ile yavaş yavaş dursun. Duvar ekranı da aynı dönüşü gösterir.")
                  : data.type === "plak"
                    ? tx("Onaylandın. Döndür’e bas. Kapaklar döner, kalan parça çalar.")
                  : data.type === "match"
                    ? tx("Onaylandın. Sunucu hafızayı veya eşleştirmeyi başlatınca kartlar gelir.")
                    : tx("Onaylandın. Sunucu oyunu başlatınca soru gelir.")}
              </div>
            ) : null}
            {data.type !== "wheel" && data.type !== "match" && data.type !== "kilo" && data.type !== "hatira" && data.type !== "plak" && data.phase === "closed" ? (
              <div className="game-panel space-y-3">
                <div className="display text-3xl">{tx("Yarışma bitti")}</div>
                <p className="mt-2">{t("quiz.endedScore", { n: data.me?.score ?? 0 })}</p>
                <ShareBar text={`${data.me?.nickname || ""} COP31 Sağlık oyununda ${data.me?.score ?? 0} puan.`} />
              </div>
            ) : null}
            {data.paused ? <div className="game-panel">{tx("Oyun durdu.")}</div> : null}

            {data.type === "plak" ? (
              <div className="game-panel space-y-3">
                <PlakReel
                  tracks={data.plak?.tracks || []}
                  index={Math.max(0, data.plak?.index || 0)}
                  startedAt={data.plak?.startedAt || null}
                  spinning={Boolean(data.plak?.spinning)}
                />
                {data.plak?.spinning ? <p className="text-center">{tx("Kapaklar dönüyor…")}</p> : null}
                {data.plak && data.plak.index >= 0 && data.plak.tracks[data.plak.index] ? (
                  <div className="text-center space-y-2">
                    {data.plak.spinning ? null : <div className="display text-3xl">{data.plak.tracks[data.plak.index].title}</div>}
                    <p>{`Bu parça ${data.spinPlayer?.nickname || ""}'dan geliyor`}</p>
                    {data.spinPlayer?.id === data.me?.id ? <PlakPlayer videoId={data.plak.tracks[data.plak.index].videoId} /> : null}
                    {data.plak.spinning ? null : (
                      <ShareBar text={`Bu parça ${data.spinPlayer?.nickname || "COP31"}'dan geliyor: ${data.plak.tracks[data.plak.index].title}`} />
                    )}
                  </div>
                ) : null}
                <button
                  className="btn w-full justify-center"
                  type="button"
                  disabled={busy || Boolean(data.plak?.spinning) || !data.plak?.tracks.length}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await api(`/api/public/games/${slug}/plak`, { method: "POST" });
                      await reload();
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {tx("Döndür")}
                </button>
              </div>
            ) : null}

            {data.type === "wheel" ? (
              <div className="game-panel space-y-3">
                <div className="flex justify-center">
                  <PrizeWheel
                    slices={data.slices || []}
                    angle={wheelAngle}
                    size={280}
                    spinning={wheel.mode !== "idle"}
                    mode={wheel.mode}
                    highlight={reveal ? data.currentIndex : null}
                  />
                </div>
                {data.spinPlayer?.id === data.me?.id ? (
                  <p className="text-center font-semibold" style={{ color: "#0088C8" }}>
                    {wheel.mode === "coast" ? tx("Çark dönüyor. Durdur’a bas.") : wheel.mode === "stop" ? tx("Çark yavaşlıyor…") : tx("Sıra sende. Çevir.")}
                  </p>
                ) : data.spinPlayer ? (
                  <p className="text-center text-sm text-[#57534e]">{tx("Sıra:")} {data.spinPlayer.nickname}</p>
                ) : (
                  <p className="text-center text-sm text-[#57534e]">{tx("Çevir’e bas. Dönünce Durdur görünür.")}</p>
                )}
                <WheelSpinButtons
                  mode={wheel.mode}
                  busy={busy}
                  canSpin={wheel.mode === "idle"}
                  canStop={wheel.mode === "coast" && data.spinPlayer?.id === data.me?.id}
                  onSpin={() => void spinWheel("spin")}
                  onStop={() => void spinWheel("stop")}
                />
                {reveal && data.landed ? (
                  <div className="p-4 text-center text-[#EEF8FD]" style={{ background: data.landed.color }}>
                    <div className="text-xs tracking-[0.16em] uppercase opacity-80">{tx(sliceKindLabel(data.landed.kind))}</div>
                    <div className="display text-4xl mt-1">{tx(data.landed.label)}</div>
                    {data.spinPlayer?.id === data.me?.id && data.landed.kind === "prize" ? <p className="mt-2">{tx("Hediyen bu.")}</p> : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {data.type === "match" ? (
              <div className="space-y-3">
                {data.match ? (
                  <div className="game-panel space-y-3">
                    <TouchMeters meters={data.match.meters} />
                  </div>
                ) : null}
                {data.phase === "asking" ? (
                  <div className="game-panel space-y-3">
                    <TimerRing remaining={left} total={data.seconds} />
                    {data.matchBoard ? (
                      <MatchPhone slug={slug} view={data.matchBoard} onReload={reload} />
                    ) : (
                      <p>{tx("Kartlar açılıyor…")}</p>
                    )}
                  </div>
                ) : null}
                {reveal ? (
                  <div className="game-panel">
                    <div className="display text-4xl" style={{ color: "#22A34A" }}>{data.me?.score} {tx("puan")}</div>
                    <p className="mt-2">{tx("Tur bitti. Doğru eşleşmeler puanına yazıldı.")}</p>
                  </div>
                ) : null}
              </div>
            ) : null}

            {data.type !== "wheel" && data.type !== "match" && data.type !== "plak" && data.type !== "kilo" && data.type !== "hatira" && data.phase === "asking" && data.question ? (
              <div className="game-panel space-y-3">
                <div className="text-xs uppercase tracking-[0.14em] text-[#0077C2]">
                  {t("common.qProgress", { n: (data.question.index ?? 0) + 1, total: data.total })}
                </div>
                <TimerRing remaining={left} total={data.seconds} />
                <QuestionVideo url={data.question.videoUrl} path={data.question.videoPath} title={data.question.prompt} compact />
                <h2 className="display text-2xl">{tx(data.question.prompt)}</h2>
                <div className="q-opts">
                  {data.question.options.map((o, i) => {
                    const selected = picked === i || data.me?.choice === i;
                    const locked = Boolean(data.me?.answered || picked != null);
                    const letterBg = ["#0088C8", "#22A34A", "#00A3E0", "#E31C23"][i % 4];
                    return (
                      <button
                        key={o}
                        type="button"
                        disabled={busy || locked}
                        onClick={() => void answer(i)}
                        className={`q-opt ${selected ? "is-picked" : ""}`}
                        style={
                          selected
                            ? { background: "#00A3E0", color: "#FFFFFF", borderColor: "#00A3E0", boxShadow: "inset 0 0 0 3px #FFFFFF" }
                            : locked
                              ? { background: "#EEF8FD", color: "#7a746c", borderColor: "#B5DFF2" }
                              : { background: "#FFFFFF", color: "#0B1C33", borderColor: "#00A3E0" }
                        }
                      >
                        <span className="q-letter" style={{ background: selected ? "#FFFFFF" : letterBg, color: selected ? "#00A3E0" : "#FFFFFF" }}>
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span className="q-opt-text">{tx(o)}</span>
                        {selected ? <span className="q-opt-tag">{tx("İşaretlendi")}</span> : null}
                      </button>
                    );
                  })}
                </div>
                {data.me?.answered || picked != null ? (
                  <p className="text-sm" style={{ color: "#00A3E0" }}>
                    {tx("Seçimin kilitlendi.")}
                  </p>
                ) : (
                  <p className="text-sm text-[#57534e]">{tx("Bir şıkkı işaretle. Seçince kilitlenir.")}</p>
                )}
              </div>
            ) : null}

            {data.type !== "wheel" && data.type !== "match" && reveal && data.question ? (
              <div className="game-panel space-y-3">
                <div className="display text-5xl" style={{ color: data.me?.correct ? "#22A34A" : "#0077C2" }}>
                  {data.me?.answered ? (data.me.correct ? tx("Doğru") : tx("Yanlış")) : tx("Yanıt yok")}
                </div>
                <QuestionVideo url={data.question.videoUrl} path={data.question.videoPath} title={data.question.prompt} compact />
                <p className="mt-2">{tx(data.question.prompt)}</p>
                <div className="q-opts">
                  {data.question.options.map((o, i) => {
                    const selected = data.me?.choice === i;
                    const isCorrect = data.question?.correctIndex === i;
                    const letterBg = ["#0088C8", "#22A34A", "#00A3E0", "#E31C23"][i % 4];
                    return (
                      <div
                        key={o}
                        className={`q-opt ${isCorrect ? "is-correct" : ""}`}
                        style={
                          isCorrect
                            ? undefined
                            : selected
                              ? { background: "#00A3E0", color: "#FFFFFF", borderColor: "#00A3E0" }
                              : { background: "#EEF8FD", color: "#7a746c", borderColor: "#B5DFF2" }
                        }
                      >
                        <span className="q-letter" style={{ background: isCorrect ? "#22A34A" : selected ? "#EEF8FD" : letterBg, color: selected && !isCorrect ? "#0088C8" : "#EEF8FD" }}>
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span className="q-opt-text">{tx(o)}</span>
                        {isCorrect ? <span className="q-opt-tag">{tx("Doğru")}</span> : selected ? <span className="q-opt-tag">{tx("Senin işaretin")}</span> : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </>
        ) : null}
        {msg ? <p className="text-sm text-[#0077C2]">{tx(msg)}</p> : null}
      </div>
    </GameStage>
  );
}

export default function JoinPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return <Join slug={slug} />;
}
