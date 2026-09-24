"use client";

import { use, useEffect, useState } from "react";
import { useApi, useGameLive } from "@/lib/client";
import { QrImage, usePublicOrigin } from "@/components/QrImage";
import { NameList, Scoreboard } from "@/components/game/Board";
import { QuestionOptions, QuestionVideo } from "@/components/game/QuestionMedia";
import { PrizeWheel, useWheelMotion } from "@/components/game/PrizeWheel";
import { describeWheel, sliceKindLabel } from "@/lib/wheel";
import { TouchMeters, TouchScene } from "@/components/game/TouchWorld";
import { SolvedChips } from "@/components/game/MatchPlay";
import { KiloWallView } from "@/components/game/KiloPlay";
import type { KiloPublic } from "@/lib/kilo-live";
import { HatiraWallView } from "@/components/game/HatiraPlay";
import type { HatiraPublic } from "@/lib/hatira";
import { useI18n } from "@/components/I18nProvider";

type Person = { id: string; nickname: string; teamName: string };
type Wall = {
  slug: string;
  title: string;
  description: string;
  gift: string;
  location: string;
  status: string;
  phase: string;
  view: string;
  type?: string;
  currentIndex: number;
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
  question: { id: string; index: number; prompt: string; options: string[]; points: number; seconds?: number; videoUrl?: string; videoPath?: string; correctIndex: number | null } | null;
  results: { correct?: Person[]; wrong?: Person[]; unanswered?: Person[]; answered: number; total: number } | null;
  board: {
    players: { id: string; rank: number; nickname: string; teamName: string; score: number; winner: boolean }[];
    teams: { name: string; color: string; score: number; members: number }[];
  };
  winner: { nickname: string; score: number; teamName: string; gift: string } | null;
  match?: { mode: string; meters: { clean: number; health: number; joy: number }; bloom: boolean; solved: string[]; totalPairs: number } | null;
  kilo?: KiloPublic | null;
  hatira?: HatiraPublic | null;
};

function Wall({ slug }: { slug: string }) {
  const { tx, t } = useI18n();
  const { data, reload, error } = useApi<Wall>(`/api/public/games/${slug}`);
  const origin = usePublicOrigin();
  const [left, setLeft] = useState(0);

  useGameLive(reload, 2000);

  useEffect(() => {
    setLeft(data?.remaining ?? 0);
  }, [data?.remaining, data?.currentIndex, data?.phase]);

  useEffect(() => {
    if (data?.phase !== "asking" || data.paused) return;
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [data?.phase, data?.paused, data?.currentIndex]);

  useEffect(() => {
    if (left !== 0 || data?.phase !== "asking" || data?.paused) return;
    const t = setTimeout(() => void reload(), 800);
    return () => clearTimeout(t);
  }, [left, data?.phase, data?.paused, reload]);

  const wheel = describeWheel(data || {});
  const wheelAngle = useWheelMotion(wheel);

  if (error && !data) {
    return (
      <main className="cop-wall min-h-screen grid place-items-center p-8 text-[#EEF8FD]">
        <div className="text-center space-y-3">
          <h1 className="display text-4xl">{tx("Duvar ekranı")}</h1>
          <p className="text-[#C8EEFA]">{tx(error)}</p>
          <button className="btn" type="button" onClick={() => void reload()}>{tx("Yeniden dene")}</button>
        </div>
      </main>
    );
  }

  if (!data) {
    return <main className="cop-wall min-h-screen grid place-items-center text-[#EEF8FD]">{tx("Oyun yükleniyor…")}</main>;
  }

  const wall = data;

  const reveal = wall.phase === "reveal" || wall.phase === "closed";
  const showBoard = wall.view === "board" || wall.phase === "closed";
  const players = wall.board?.players || [];
  const hasVideo = Boolean(wall.question?.videoUrl || wall.question?.videoPath);
  const isWheel = wall.type === "wheel";
  const isMatch = wall.type === "match";
  const isKilo = wall.type === "kilo";
  const isHatira = wall.type === "hatira";

  return (
    <main className="cop-wall min-h-screen text-[#EEF8FD] grid lg:grid-cols-[1fr_300px]">
      <section className="p-6 md:p-10 flex flex-col">
        <p className="text-xs tracking-[0.28em] uppercase opacity-70 flex items-center gap-3">
          {wall.location} · {tx("duvar ekranı")}
          {wall.phase === "asking" || wall.wheelMode === "coast" || wall.wheelMode === "stop" ? (
            <span className="game-live">{tx("CANLI")}</span>
          ) : null}
        </p>
        <h1 className="display text-4xl md:text-6xl mt-2">{tx(wall.title)}</h1>

        {isHatira ? (
          <div className="mt-6 flex-1">
            <HatiraWallView hatira={wall.hatira || null} />
          </div>
        ) : isKilo ? (
          <div className="mt-6 flex-1">
            <KiloWallView kilo={wall.kilo || null} large />
          </div>
        ) : isMatch ? (
          <div className="mt-6 flex-1 space-y-5">
            <p className="text-xl text-[#C8EEFA]">
              {wall.phase === "asking"
                ? wall.currentIndex === 1
                  ? tx("Eşleştirme: konsepti açıklamasıyla tutturun.")
                  : tx("Hafıza: iki kart açın, aynı konsepti bulun.")
                : wall.phase === "closed"
                  ? tx("Turlar bitti. En yüksek puan birinci.")
                  : tx("Karekodu okutun. Admin rumuzu onaylayınca telefonunuzda kartlar açılır.")}
            </p>
            {wall.phase === "asking" ? (
              <div>
                <div className="display tabular-nums leading-none" style={{ fontSize: "clamp(4rem, 12vw, 8rem)", color: left <= 5 ? "#FAD4D6" : "#EEF8FD" }}>
                  {left}
                </div>
                <div className="text-xl tracking-[0.2em] uppercase opacity-70">{tx("saniye")}</div>
              </div>
            ) : null}
            <div className="p-4 space-y-4" style={{ background: "#EEF8FD", color: "#1c1917" }}>
              <TouchScene meters={wall.match?.meters || { clean: 18, health: 16, joy: 14 }} bloom={wall.match?.bloom} />
              <TouchMeters meters={wall.match?.meters || { clean: 18, health: 16, joy: 14 }} />
              <SolvedChips solved={wall.match?.solved || []} />
            </div>
            {showBoard ? (
              <div className="p-6" style={{ background: "#EEF8FD", color: "#1c1917" }}>
                <h2 className="display text-5xl">{tx("Puan tablosu")}</h2>
                {wall.winner ? (
                  <p className="mt-2 text-xl">{tx("Birinci:")} <strong>{wall.winner.nickname}</strong> · {wall.winner.score} {tx("puan")}</p>
                ) : null}
                <div className="mt-6">
                  <Scoreboard players={players} teams={wall.board?.teams} />
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {players.map((p) => (
                  <span key={p.id} className="display text-3xl px-4 py-2" style={{ background: "#0088C8" }}>{p.nickname}</span>
                ))}
              </div>
            )}
          </div>
        ) : showBoard && !isWheel ? (
          <div className="mt-8 flex-1 p-6" style={{ background: "#EEF8FD", color: "#1c1917" }}>
            <h2 className="display text-5xl">{tx("Puan tablosu")}</h2>
            {wall.winner ? (
              <p className="mt-2 text-xl">{tx("Birinci:")} <strong>{wall.winner.nickname}</strong> · {wall.winner.score} {tx("puan")}</p>
            ) : null}
            <div className="mt-6">
              <Scoreboard players={players} teams={wall.board?.teams} />
            </div>
          </div>
        ) : isWheel ? (
          <div className="mt-6 flex-1 grid lg:grid-cols-[minmax(280px,1fr)_minmax(220px,0.6fr)] gap-8 items-center">
            <div className="flex justify-center">
              <PrizeWheel
                slices={wall.slices || []}
                angle={wheelAngle}
                size={480}
                spinning={wheel.mode !== "idle"}
                mode={wheel.mode}
                highlight={reveal ? wall.currentIndex : null}
              />
            </div>
            <div>
              {wall.phase === "lobby" || (wall.currentIndex < 0 && wheel.mode === "idle") ? (
                <>
                  <p className="text-2xl text-[#C8EEFA]">{tx("Karekodu okutun. Onaylanan oyuncu Çevir’e basar; Durdur deyince çark yavaşlar.")}</p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    {players.length === 0 ? <p className="text-[#C8EEFA]">{tx("Henüz onaylı oyuncu yok.")}</p> : null}
                    {players.map((p) => (
                      <span key={p.id} className="display text-3xl px-4 py-2" style={{ background: "#0088C8" }}>{p.nickname}</span>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xl tracking-[0.16em] uppercase text-[#C8EEFA] mt-2">
                    {wall.spinPlayer ? wall.spinPlayer.nickname : tx("Salon çevirmesi")}
                  </p>
                  {wheel.mode === "coast" ? (
                    <div className="mt-5">
                      <div className="wheel-screen-btn is-stop">{tx("Durdur")}</div>
                      <h2 className="display text-4xl mt-4">{tx("Çark dönüyor")}</h2>
                      <p className="mt-2 text-[#C8EEFA]">{tx("Oyuncu Durdur’a bassın. Çark yavaş yavaş duracak.")}</p>
                    </div>
                  ) : wheel.mode === "stop" ? (
                    <div className="mt-5">
                      <div className="wheel-screen-btn is-slowing">{tx("Duruyor…")}</div>
                      <h2 className="display text-4xl mt-4">{tx("Yavaşlıyor")}</h2>
                    </div>
                  ) : reveal && wall.landed ? (
                    <div className="mt-5 p-5" style={{ background: wall.landed.color }}>
                      <div className="text-xs tracking-[0.2em] uppercase opacity-80">{tx(sliceKindLabel(wall.landed.kind))}</div>
                      <h2 className="display text-5xl md:text-7xl mt-2">{tx(wall.landed.label)}</h2>
                    </div>
                  ) : (
                    <h2 className="display text-4xl mt-4">{tx("Çark hazır")}</h2>
                  )}
                </>
              )}
            </div>
          </div>
        ) : wall.phase === "lobby" || wall.currentIndex < 0 ? (
          <div className="mt-10 flex-1">
            <p className="text-2xl text-[#C8EEFA]">{tx("Karekodu okutun, rumuz seçin. Admin onaylayınca ekranda görünürsünüz.")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              {players.length === 0 ? <p className="text-[#C8EEFA]">{tx("Henüz onaylı oyuncu yok.")}</p> : null}
              {players.map((p) => (
                <span key={p.id} className="display text-3xl px-4 py-2" style={{ background: "#0088C8" }}>{p.nickname}</span>
              ))}
            </div>
          </div>
        ) : wall.question ? (
          <div className="mt-6 flex-1">
            <div className="text-sm tracking-[0.2em] uppercase text-[#C8EEFA]">
              {t("common.qProgress", { n: wall.question.index + 1, total: wall.total })} · {wall.question.points} {tx("puan")} · {wall.seconds} {tx("sn")}
            </div>
            {wall.phase === "asking" ? (
              <div className="mt-4">
                <div className="display tabular-nums leading-none" style={{ fontSize: hasVideo ? "clamp(3rem, 9vw, 7rem)" : "clamp(4rem, 16vw, 10rem)", color: left <= 5 ? "#FAD4D6" : "#EEF8FD" }}>
                  {left}
                </div>
                <div className="text-xl tracking-[0.2em] uppercase opacity-70">{tx("saniye")}</div>
                <div className="mt-3 h-3 bg-[#0090D0] max-w-xl overflow-hidden">
                  <div className="h-full" style={{ width: `${Math.max(0, (left / Math.max(1, wall.seconds)) * 100)}%`, background: left <= 5 ? "#c45c48" : "#d7e4d8" }} />
                </div>
              </div>
            ) : null}
            <div className={`mt-4 ${hasVideo ? "q-wall-split" : ""}`}>
              <h2 className="display text-4xl md:text-6xl leading-tight">{tx(wall.question.prompt)}</h2>
              <QuestionVideo url={wall.question.videoUrl} path={wall.question.videoPath} title={wall.question.prompt} />
            </div>
            <div className="mt-8">
              <QuestionOptions options={wall.question.options} correctIndex={wall.question.correctIndex} reveal={reveal} size="xl" />
            </div>
            {reveal ? (
              <div className="mt-8 p-5" style={{ background: "#EEF8FD", color: "#1c1917" }}>
                <h3 className="display text-3xl">{tx("Doğru işaretleyenler")}</h3>
                <div className="mt-3">
                  <NameList title="Doğru" tone="ok" people={wall.results?.correct || []} />
                </div>
                <div className="mt-4">
                  <Scoreboard players={players} teams={wall.board?.teams} />
                </div>
              </div>
            ) : (
              <p className="mt-6 text-[#C8EEFA]">{t("common.answered", { n: wall.results?.answered || 0, total: players.length })}</p>
            )}
          </div>
        ) : (
          <div className="mt-10 flex-1">
            <p className="text-2xl text-[#C8EEFA]">{tx("Admin sonraki turu başlatsın. Karekod açık, rumuzlar burada görünür.")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              {players.length === 0 ? <p className="text-[#C8EEFA]">{tx("Henüz onaylı oyuncu yok.")}</p> : null}
              {players.map((p) => (
                <span key={p.id} className="display text-3xl px-4 py-2" style={{ background: "#0088C8" }}>{p.nickname}</span>
              ))}
            </div>
          </div>
        )}
      </section>

      <aside className="p-6 flex flex-col items-center gap-4" style={{ background: "#0088C8" }}>
        <div className="bg-[#EEF8FD] p-3">
          <QrImage path={`/oyun/${wall.slug}/katil`} alt="Katıl QR" size={220} />
        </div>
        <p className="text-center text-sm tracking-[0.16em] uppercase">{tx("Katılmak için okut")}</p>
        <p className="text-center text-xs opacity-80 break-all">{origin ? `${origin}/oyun/${wall.slug}/katil` : tx("Karekod yükleniyor")}</p>
        <p className="text-center text-xs opacity-80">{isHatira ? tx("Selfie çek, hazırla, gönder") : isKilo ? tx("Cinsiyet, yaş, boy, kilo gir") : tx("Rumuz seç → admin onaylar → oyuncu olursun")}</p>
        {!isKilo && !isHatira ? (
        <div className="w-full mt-4">
          <div className="text-xs tracking-[0.16em] uppercase opacity-70">{tx("Puanlar")}</div>
          <div className="mt-3">
            <Scoreboard players={players} variant="compact" tone="dark" />
          </div>
        </div>
        ) : null}
      </aside>
    </main>
  );
}

export default function GameWallPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return <Wall slug={slug} />;
}
