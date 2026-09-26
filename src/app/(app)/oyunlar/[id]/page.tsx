"use client";

import { use, useEffect, useState } from "react";
import { api, useApi, useRealtime } from "@/lib/client";
import { QrImage, usePublicOrigin } from "@/components/QrImage";
import { QuestionVideo } from "@/components/game/QuestionMedia";
import { PrizeWheel } from "@/components/game/PrizeWheel";
import { Scoreboard } from "@/components/game/Board";
import { SLICE_COLORS } from "@/lib/wheel";
import { CONCEPTS } from "@/lib/match-cards";
import { useI18n } from "@/components/I18nProvider";

type Question = {
  id?: string;
  prompt: string;
  options: string[];
  answer: number;
  points: number;
  seconds: number;
  videoUrl: string;
  videoPath: string;
};
type BoardPlayer = {
  id: string;
  rank: number;
  nickname: string;
  teamName: string;
  score: number;
  bonus: number;
  answered: number;
  winner: boolean;
};
type Slice = {
  id?: string;
  label: string;
  color: string;
  kind: "prize" | "again" | "miss";
};
type Detail = {
  id: string;
  slug: string;
  title: string;
  description: string;
  gift: string;
  location: string;
  status: string;
  published: boolean;
  type: string;
  seconds?: number;
  questions: Question[];
  slices: Slice[];
  tracks?: { id: string; title: string; artist: string; url: string; imageUrl: string }[];
  board: {
    players: BoardPlayer[];
    teams: { name: string; color: string; score: number; members: number }[];
  };
};

const emptyQ = (): Question => ({ prompt: "", options: ["", "", "", ""], answer: 0, points: 10, seconds: 15, videoUrl: "", videoPath: "" });
const emptySlice = (): Slice => ({ label: "", color: SLICE_COLORS[0], kind: "prize" });

function hydrateSlices(list: Slice[]): Slice[] {
  return list.length
    ? list.map((s, i) => ({
        ...emptySlice(),
        ...s,
        color: s.color || SLICE_COLORS[i % SLICE_COLORS.length],
        kind: s.kind === "again" || s.kind === "miss" ? s.kind : "prize",
      }))
    : [emptySlice(), emptySlice()];
}

function hydrateQuestions(list: Question[]): Question[] {
  return list.length
    ? list.map((q) => ({
        ...emptyQ(),
        ...q,
        seconds: q.seconds || 15,
        videoUrl: q.videoUrl || "",
        videoPath: q.videoPath || "",
      }))
    : [emptyQ()];
}

export default function GameAdminDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { tx } = useI18n();
  const { data, reload } = useApi<Detail>(`/api/games/${id}`);
  const origin = usePublicOrigin();
  const [title, setTitle] = useState("");
  const [gift, setGift] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [slices, setSlices] = useState<Slice[]>([]);
  const [seconds, setSeconds] = useState(75);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!data) return;
    setTitle(data.title);
    setGift(data.gift);
    setDescription(data.description);
    setQuestions(hydrateQuestions(data.questions));
    setSlices(hydrateSlices(data.slices || []));
    setSeconds(data.seconds || 75);
  }, [data]);

  useRealtime((t) => {
    if (t === "game") void reload();
  });

  async function runGame(action: string) {
    setMsg("");
    try {
      await api(`/api/games/${id}/run`, { method: "POST", body: JSON.stringify({ action }) });
      await reload(true);
      setMsg(action === "restart" ? "Yarışma baştan açıldı" : "Lobiye alındı");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Komut alınamadı");
    }
  }

  async function saveMeta(extra: Record<string, unknown> = {}) {
    setMsg("");
    const saved = await api<Detail>(`/api/games/${id}`, {
      method: "PATCH",
      body: JSON.stringify(
        data?.type === "wheel"
          ? { title, gift, description, slices, ...extra }
          : data?.type === "match" || data?.type === "kilo" || data?.type === "hatira"
            ? { title, gift, description, seconds, ...extra }
            : { title, gift, description, questions, ...extra },
      ),
    });
    setQuestions(hydrateQuestions(saved.questions || []));
    setSlices(hydrateSlices(saved.slices || []));
    await reload();
    setMsg("Kaydedildi");
  }

  async function bump(playerId: string, delta: number) {
    await api(`/api/games/${id}/score`, { method: "POST", body: JSON.stringify({ playerId, delta }) });
    await reload();
  }

  async function award(playerId?: string) {
    if (!confirm("Birinciye ödül verilsin ve oyun kapansın mı?")) return;
    await api(`/api/games/${id}/award`, { method: "POST", body: JSON.stringify({ playerId }) });
    await reload();
  }

  if (!data) return <p>{tx("Yükleniyor…")}</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between gap-3 flex-wrap">
        <div>
          <a href="/oyunlar" className="text-xs underline">{tx("← Oyunlar")}</a>
          <h1 className="display text-4xl mt-1">{tx(data.title)}</h1>
          <p className="text-[#57534e]">
            {tx(
              data.type === "wheel"
              ? "Çarka hediye dilimleri ekleyin. Oyuncu Çevir’e basınca Durdur görünür; çark yavaş yavaş durur, ok üstte kalır."
              : data.type === "match"
                ? "Oyuncular telefondan hafıza ve eşleştirme oynar. Doğru eşleşmeye 10 puan. Kirlilik azalır, sağlık ve mutluluk artar."
                : data.type === "kilo"
                  ? "Ziyaretçi yaş, boy ve kilo girer. 2035’e kadar gıda kaynaklı karbon izi telefonda ve duvarda animasyonla çıkar."
                  : data.type === "hatira"
                    ? "Ziyaretçi karekodu okutunca selfie çeker. Hazırla deyince COP31 Sağlık Bakanlığı hatıra fonu gelir. Gönderince admin onayına düşer."
                    : data.type === "plak"
                      ? "YouTube Music bağlantısını yapıştırın. Oyuncu Döndür’e basınca kapaklar döner, bir parça kalır ve çalar. Ekranda bu parça rumuzdan geliyor yazar."
                : "Her soruya süre, puan ve isteğe bağlı video ekleyin. Varsayılan süre 15 saniyedir.",
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a className="btn" href={`/sunucu/${data.slug}`}>Admin yönetim</a>
          <a className="btn ghost" href={`/oyun/${data.slug}`} target="_blank">Duvar ekranı</a>
          {data.type !== "wheel" && data.type !== "match" && data.type !== "kilo" && data.type !== "hatira" && data.type !== "plak" ? (
            <>
              <button className="btn ghost" onClick={() => void runGame("lobby")}>Lobiye al</button>
              <button className="btn ghost" onClick={() => void runGame("restart")}>Yeniden başlat</button>
            </>
          ) : (
            <button className="btn ghost" onClick={() => void saveMeta({ status: "lobby", phase: "lobby", currentIndex: -1 })}>Lobiyi aç</button>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="card p-4 flex gap-4 items-center">
          <QrImage path={`/oyun/${data.slug}/katil`} alt="Katıl QR" size={140} />
          <div>
            <div className="text-xs tracking-[0.16em] uppercase text-[#0077C2]">Telefon giriş karekodu</div>
            <p className="text-sm mt-1">{data.type === "kilo" ? "Karekod doğrudan hesap formunu açar. Rumuz gerekmez." : data.type === "hatira" ? "Karekod doğrudan selfie kamerasını açar. Admin onaylarsa duvarda görünür." : "Duvara yansıtılan oyunun QRsı da bunu açar. Rumuz admin onayına düşer."}</p>
            <a className="text-sm text-[#0077C2] underline" href={`/oyun/${data.slug}/katil`} target="_blank">{origin}/oyun/{data.slug}/katil</a>
            <div className="mt-2">
              <span className={`badge ${data.status === "live" ? "ok" : data.status === "lobby" ? "warn" : "muted"}`}>{data.status}</span>
            </div>
          </div>
        </div>
        <div className="card p-4 grid gap-2">
          <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input className="field" value={gift} onChange={(e) => setGift(e.target.value)} />
          <textarea className="field" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="flex gap-2">
            <button className="btn" onClick={() => void saveMeta()}>Kaydet</button>
            {data.type !== "match" && data.type !== "kilo" && data.type !== "hatira" && data.type !== "plak" ? (
              <button
                className="btn ghost"
                onClick={() => void saveMeta({ loadSample: true })}
              >
                {data.type === "wheel" ? "Örnek hediyeleri yükle" : "Örnek 5 soruyu yükle"}
              </button>
            ) : null}
          </div>
          {msg ? <p className="text-sm text-[#22A34A]">{msg}</p> : null}
        </div>
      </div>

      {data.type === "plak" ? <PlakEditor id={data.id} tracks={data.tracks || []} onDone={() => reload()} /> : null}

      {data.type === "hatira" ? (
      <section className="card p-4 space-y-3">
        <h2 className="display text-3xl">Hatıra</h2>
        <p className="text-sm text-[#57534e]">
          Ziyaretçi karekodu okutur, selfie çeker, Hazırla deyince COP31 Türkiye Sağlık Bakanlığı Hatırası fonu gelir. Gönderince fotoğraf sunucu ekranına düşer. Onaylarsanız duvar ekranında, altında Teşekkür ederiz yazısıyla görünür.
        </p>
        <button className="btn" onClick={() => void saveMeta()}>Kaydet</button>
      </section>
      ) : data.type === "kilo" ? (
      <section className="card p-4 space-y-3">
        <h2 className="display text-3xl">Kilo karbon</h2>
        <p className="text-sm text-[#57534e]">
          Ziyaretçi yaş, boy ve kilo girer. Mifflin-St Jeor tabanlı enerji ihtiyacı ve karışık diyet yoğunluğuyla 2035’e kadar gıda kaynaklı CO₂e kabaca hesaplanır. Sonuç telefonda ve duvarda canlanır. Rumuz gerekmez.
        </p>
        <button className="btn" onClick={() => void saveMeta()}>Kaydet</button>
      </section>
      ) : data.type === "match" ? (
      <section className="card p-4 space-y-4">
        <h2 className="display text-3xl">Dokunmatik turlar</h2>
        <label className="text-sm">Tur süresi (saniye)
          <input className="field mt-1 max-w-[12rem]" type="number" min={30} max={180} value={seconds} onChange={(e) => setSeconds(Number(e.target.value) || 75)} />
        </label>
        <p className="text-sm text-[#57534e]">1. tur hafıza (8 çift). 2. tur dokuz konsepti açıklamasıyla eşleştirme. Her doğru +10 puan.</p>
        <div className="grid md:grid-cols-3 gap-2">
          {CONCEPTS.filter((c) => c.n <= 9).map((c) => (
            <div key={c.id} className="p-3 border border-[#DCE8F0]" style={{ background: "#FFFFFF" }}>
              <div className="text-xs uppercase tracking-[0.14em] text-[#0077C2]">{c.n}</div>
              <div className="font-semibold mt-1">{c.title}</div>
              <p className="text-xs text-[#57534e] mt-1">{c.hint}</p>
            </div>
          ))}
        </div>
        <button className="btn" onClick={() => void saveMeta()}>Kaydet</button>
      </section>
      ) : data.type === "wheel" ? (
      <section className="card p-4 space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <h2 className="display text-3xl">Çark dilimleri</h2>
          <button className="btn ghost" onClick={() => setSlices((s) => [...s, { ...emptySlice(), color: SLICE_COLORS[s.length % SLICE_COLORS.length] }])}>
            Dilim ekle
          </button>
        </div>
        <div className="flex justify-center">
          <PrizeWheel slices={slices.filter((s) => s.label)} angle={0} size={280} />
        </div>
        {slices.map((s, i) => (
          <div key={s.id || i} className="grid md:grid-cols-[1fr_140px_140px_auto] gap-2 items-end border border-[#DCE8F0] p-3" style={{ background: "#FFFFFF" }}>
            <label className="text-sm">Hediye / yazı
              <input
                className="field mt-1"
                value={s.label}
                placeholder="Bez çanta"
                onChange={(e) => {
                  const next = [...slices];
                  next[i] = { ...s, label: e.target.value };
                  setSlices(next);
                }}
              />
            </label>
            <label className="text-sm">Tür
              <select
                className="field mt-1"
                value={s.kind}
                onChange={(e) => {
                  const next = [...slices];
                  next[i] = { ...s, kind: e.target.value as Slice["kind"] };
                  setSlices(next);
                }}
              >
                <option value="prize">Hediye</option>
                <option value="again">Tekrar çevir</option>
                <option value="miss">Boş / teşekkür</option>
              </select>
            </label>
            <label className="text-sm">Renk
              <input
                className="field mt-1"
                type="color"
                value={s.color}
                onChange={(e) => {
                  const next = [...slices];
                  next[i] = { ...s, color: e.target.value };
                  setSlices(next);
                }}
              />
            </label>
            <button className="text-xs underline mb-2" onClick={() => setSlices((list) => list.filter((_, idx) => idx !== i))}>Sil</button>
          </div>
        ))}
        <button className="btn" onClick={() => void saveMeta()}>Dilimleri kaydet</button>
      </section>
      ) : data.type === "plak" ? null : (
      <section className="card p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="display text-3xl">Sorular</h2>
          <button className="btn ghost" onClick={() => setQuestions((q) => [...q, emptyQ()])}>Soru ekle</button>
        </div>
        {questions.map((q, qi) => (
          <div key={q.id || qi} className="border border-[#DCE8F0] p-4 space-y-3" style={{ background: "#FFFFFF" }}>
            <div className="flex justify-between gap-2 items-center">
              <div className="display text-2xl text-[#0077C2]">Soru {qi + 1}</div>
              <button className="text-xs underline" onClick={() => setQuestions((list) => list.filter((_, i) => i !== qi))}>Sil</button>
            </div>
            <input className="field" placeholder="Soru metni" value={q.prompt} onChange={(e) => {
              const next = [...questions];
              next[qi] = { ...q, prompt: e.target.value };
              setQuestions(next);
            }} />
            <div className="grid md:grid-cols-2 gap-2">
              {q.options.map((opt, oi) => (
                <label key={oi} className="flex gap-2 items-center">
                  <input
                    type="radio"
                    name={`ans-${qi}`}
                    checked={q.answer === oi}
                    onChange={() => {
                      const next = [...questions];
                      next[qi] = { ...q, answer: oi };
                      setQuestions(next);
                    }}
                  />
                  <span className="q-editor-letter" style={{ background: q.answer === oi ? "#22A34A" : "#0088C8" }}>
                    {String.fromCharCode(65 + oi)}
                  </span>
                  <input
                    className="field"
                    placeholder={`${String.fromCharCode(65 + oi)} şıkkı`}
                    value={opt}
                    onChange={(e) => {
                      const options = [...q.options];
                      options[oi] = e.target.value;
                      const next = [...questions];
                      next[qi] = { ...q, options };
                      setQuestions(next);
                    }}
                  />
                </label>
              ))}
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <label className="text-sm">Süre (saniye)
                <input
                  className="field mt-1"
                  type="number"
                  min={5}
                  max={180}
                  value={q.seconds}
                  onChange={(e) => {
                    const next = [...questions];
                    next[qi] = { ...q, seconds: Number(e.target.value) || 15 };
                    setQuestions(next);
                  }}
                />
                <span className="text-xs text-[#57534e]">Varsayılan 15</span>
              </label>
              <label className="text-sm">Puan
                <input
                  className="field mt-1"
                  type="number"
                  min={1}
                  value={q.points}
                  onChange={(e) => {
                    const next = [...questions];
                    next[qi] = { ...q, points: Number(e.target.value) || 10 };
                    setQuestions(next);
                  }}
                />
              </label>
              <label className="text-sm">Video bağlantısı
                <input
                  className="field mt-1"
                  placeholder="YouTube / Vimeo / MP4 URL"
                  value={q.videoUrl}
                  onChange={(e) => {
                    const next = [...questions];
                    next[qi] = { ...q, videoUrl: e.target.value };
                    setQuestions(next);
                  }}
                />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <label className="btn ghost">
                Video yükle
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  hidden
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    if (!q.id) {
                      setMsg("Videoyu yüklemek için önce soruları kaydedin.");
                      return;
                    }
                    setMsg("Video yükleniyor…");
                    try {
                      const fd = new FormData();
                      fd.append("questionId", q.id);
                      fd.append("file", file);
                      const saved = await api<{ videoPath: string }>(`/api/games/${id}/media`, { method: "POST", body: fd });
                      const next = [...questions];
                      next[qi] = { ...q, videoPath: saved.videoPath };
                      setQuestions(next);
                      setMsg("Video yüklendi");
                    } catch (err) {
                      setMsg(err instanceof Error ? err.message : "Video yüklenemedi");
                    }
                  }}
                />
              </label>
              {q.videoPath ? <span className="text-[#22A34A]">Yüklü video var</span> : <span className="text-[#57534e]">Dosya en fazla 40 MB · MP4/WebM</span>}
              {q.videoPath ? (
                <button
                  className="text-xs underline"
                  type="button"
                  onClick={() => {
                    const next = [...questions];
                    next[qi] = { ...q, videoPath: "" };
                    setQuestions(next);
                  }}
                >
                  Videoyu kaldır
                </button>
              ) : null}
            </div>
            {q.videoUrl || q.videoPath ? (
              <QuestionVideo url={q.videoUrl} path={q.videoPath} title={q.prompt} compact />
            ) : null}
          </div>
        ))}
        <button className="btn" onClick={() => void saveMeta()}>Soruları kaydet</button>
      </section>
      )}

      <section className="card p-4 space-y-3">
        <div className="flex justify-between flex-wrap gap-2">
          <h2 className="display text-3xl">Puanlama</h2>
          <button className="btn" onClick={() => void award()}>Sıradaki 1.ye ödül ver</button>
        </div>
        <Scoreboard players={data.board.players} teams={data.board.teams} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[#57534e]">
                <th className="py-1">#</th>
                <th>Rumuz</th>
                <th>Takım</th>
                <th>Puan</th>
                <th>Düzelt</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.board.players.map((p) => (
                <tr key={p.id} className={p.winner ? "bg-[#efe2c4]" : ""}>
                  <td className="py-1">{p.rank}</td>
                  <td>{p.nickname}{p.winner ? " · 1." : ""}</td>
                  <td>{p.teamName}</td>
                  <td>{p.score}{p.bonus ? ` (${p.bonus > 0 ? "+" : ""}${p.bonus})` : ""}</td>
                  <td className="space-x-1">
                    <button className="btn ghost" onClick={() => void bump(p.id, 5)}>+5</button>
                    <button className="btn ghost" onClick={() => void bump(p.id, -5)}>−5</button>
                  </td>
                  <td>
                    <button className="btn ghost" onClick={() => void award(p.id)}>Ödül</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function PlakEditor({
  id,
  tracks,
  onDone,
}: {
  id: string;
  tracks: { id: string; title: string; artist: string; url: string; imageUrl: string }[];
  onDone: () => void;
}) {
  const [url, setUrl] = useState("");
  const [msg, setMsg] = useState("");
  return (
    <section className="card p-4 space-y-3">
      <h2 className="display text-3xl">YouTube Music parçaları</h2>
      <p className="text-sm text-[#57534e]">Bağlantıyı yapıştırın. Kapak ve ad YouTube’dan gelir. Oyuncu Döndür’e basınca kapaklar döner, biri kalır ve o parça çalar.</p>
      <div className="flex gap-2">
        <input className="field" placeholder="https://music.youtube.com/watch?v=..." value={url} onChange={(e) => setUrl(e.target.value)} />
        <button
          className="btn"
          type="button"
          onClick={async () => {
            setMsg("");
            try {
              await api(`/api/games/${id}/tracks`, { method: "POST", body: JSON.stringify({ url }) });
              setUrl("");
              setMsg("Parça eklendi");
              onDone();
            } catch (err) {
              setMsg(err instanceof Error ? err.message : "Eklenemedi");
            }
          }}
        >
          Ekle
        </button>
      </div>
      {msg ? <p className="text-sm">{msg}</p> : null}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tracks.map((track) => (
          <article key={track.id} className="border border-[#D4ECF6] p-3">
            {track.imageUrl ? <img src={track.imageUrl} alt="" className="w-full h-28 object-cover" /> : null}
            <div className="font-semibold mt-2">{track.title}</div>
            <div className="text-sm text-[#3E6A88]">{track.artist}</div>
            <button
              className="btn ghost mt-2"
              type="button"
              onClick={async () => {
                await api(`/api/games/${id}/tracks?trackId=${track.id}`, { method: "DELETE" });
                onDone();
              }}
            >
              Sil
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
