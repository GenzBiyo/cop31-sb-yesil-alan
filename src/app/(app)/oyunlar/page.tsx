"use client";

import Link from "next/link";
import { useState } from "react";
import { api, useApi, useRealtime } from "@/lib/client";
import { QrImage } from "@/components/QrImage";
import { useI18n } from "@/components/I18nProvider";

type GameRow = {
  id: string;
  slug: string;
  title: string;
  status: string;
  gift: string;
  type: string;
  published: boolean;
  _count: { questions: number; players: number; teams: number; slices: number };
  players: { nickname: string; score: number }[];
};

const STATUS: Record<string, string> = {
  draft: "Taslak",
  lobby: "Lobi",
  live: "Canlı",
  closed: "Kapandı",
};

export default function GamesAdminPage() {
  const { tx } = useI18n();
  const { data, reload } = useApi<GameRow[]>("/api/games");
  const [title, setTitle] = useState("");
  const [gift, setGift] = useState("Birinci ödül: COP31 Sağlık Pavilionu hediye seti");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<"quiz" | "wheel" | "match" | "kilo" | "hatira" | "plak">("quiz");
  const [busy, setBusy] = useState(false);

  useRealtime((t) => {
    if (t === "game") void reload();
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="display text-4xl">{tx("Etkileşim oyunları")}</h1>
        <p className="text-[#57534e]">{tx("Soru-cevap, hediyeli çark, hafıza / eşleştirme, kilo-karbon veya hatıra fotoğrafı.")}</p>
      </div>
      <form
        className="card p-4 grid md:grid-cols-2 gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const created = await api<{ id: string }>("/api/games", {
              method: "POST",
              body: JSON.stringify({ title, gift, description, type: kind }),
            });
            setTitle("");
            setDescription("");
            window.location.href = `/oyunlar/${created.id}`;
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="md:col-span-2 flex gap-2">
          <button type="button" className={`btn ${kind === "quiz" ? "" : "ghost"}`} onClick={() => setKind("quiz")}>{tx("Soru-cevap")}</button>
          <button type="button" className={`btn ${kind === "wheel" ? "" : "ghost"}`} onClick={() => {
            setKind("wheel");
            if (!title) setTitle("Hediyeli Çark");
            if (gift.startsWith("Birinci ödül")) setGift("Pavilion hediyeleri: bez çanta, matara, rozet");
          }}>{tx("Hediyeli çark")}</button>
          <button type="button" className={`btn ${kind === "match" ? "" : "ghost"}`} onClick={() => {
            setKind("match");
            if (!title) setTitle("Yeşil Dokunuş");
            if (gift.startsWith("Birinci ödül")) setGift("En yüksek puan: COP31 Sağlık Pavilionu hediye seti");
          }}>{tx("Hafıza / eşleştirme")}</button>
          <button type="button" className={`btn ${kind === "kilo" ? "" : "ghost"}`} onClick={() => {
            setKind("kilo");
            if (!title) setTitle("Kilo Karbon");
            if (gift.startsWith("Birinci ödül")) setGift("Bilgi: daha dengeli beden, daha düşük gıda izi");
          }}>{tx("Kilo karbon")}</button>
          <button type="button" className={`btn ${kind === "plak" ? "" : "ghost"}`} onClick={() => {
            setKind("plak");
            if (!title) setTitle("Plak çevir");
            setGift("Çalan parça pavilionda kalır");
          }}>{tx("Plak çevir")}</button>
          <button type="button" className={`btn ${kind === "hatira" ? "" : "ghost"}`} onClick={() => {
            setKind("hatira");
            if (!title) setTitle("COP31 Hatıra");
            if (gift.startsWith("Birinci ödül") || gift.startsWith("Bilgi:")) setGift("Hatıran pavilion ekranında");
          }}>{tx("Hatıra")}</button>
        </div>
        <input className="field md:col-span-2" placeholder={kind === "wheel" ? "Çark başlığı" : kind === "match" ? "Dokunmatik oyun başlığı" : kind === "kilo" ? "Kilo karbon başlığı" : kind === "hatira" ? "Hatıra başlığı" : kind === "plak" ? "Plak başlığı" : "Yeni soru-cevap başlığı"} value={title} onChange={(e) => setTitle(e.target.value)} required />
        <input className="field" placeholder={kind === "wheel" ? "Hediye özeti" : "Birinci ödülü"} value={gift} onChange={(e) => setGift(e.target.value)} />
        <input className="field" placeholder="Kısa açıklama" value={description} onChange={(e) => setDescription(e.target.value)} />
        <button className="btn md:col-span-2" disabled={busy}>{busy ? tx("Oluşturuluyor…") : tx(kind === "wheel" ? "Hediyeli çark oluştur" : kind === "match" ? "Hafıza oyunu oluştur" : kind === "kilo" ? "Kilo karbon oyunu oluştur" : kind === "hatira" ? "Hatıra oyunu oluştur" : kind === "plak" ? "Plak oyunu oluştur" : "Soru-cevap oyunu oluştur")}</button>
      </form>
      <div className="space-y-2">
        {(data || []).map((g) => (
          <div key={g.id} className="card p-4 flex flex-wrap gap-4 items-center">
            <QrImage path={`/oyun/${g.slug}/katil`} alt={g.title} size={88} />
            <div className="flex-1">
              <span className={`badge ${g.status === "live" ? "ok" : g.status === "lobby" ? "warn" : "muted"}`}>{tx(STATUS[g.status])}</span>
              <div className="display text-2xl mt-1">{tx(g.title)}</div>
              <div className="text-sm text-[#57534e]">
                {g.type === "wheel"
                  ? `${g._count.slices} dilim · ${g._count.players} oyuncu`
                  : g.type === "match"
                    ? `Hafıza + eşleştirme · ${g._count.players} oyuncu`
                    : g.type === "kilo"
                      ? "Yaş · boy · kilo → 2035 karbon izi"
                      : g.type === "hatira"
                        ? "Selfie hatıra · admin onayı"
                        : g.type === "plak"
                          ? "YouTube Music · kapak çevir"
                    : `${g._count.questions} soru · ${g._count.players} oyuncu · ${g._count.teams} takım`}
                {g.players[0] ? ` · 1. ${g.players[0].nickname}` : ""}
              </div>
              <div className="mt-2 flex gap-3">
                <Link className="text-sm text-[#0077C2] underline" href={`/oyunlar/${g.id}`}>
                  {g.type === "wheel" ? "Dilimleri düzenle" : g.type === "plak" ? "Parçaları düzenle" : g.type === "match" || g.type === "kilo" || g.type === "hatira" ? "Tur ayarı" : "Soruları düzenle"}
                </Link>
                <a className="text-sm underline" href={`/oyun/${g.slug}`} target="_blank" rel="noreferrer">Duvar ekranı</a>
                <Link className="text-sm underline" href={`/sunucu/${g.slug}`}>Admin yönetim</Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
