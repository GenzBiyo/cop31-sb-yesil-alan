"use client";

import { useState } from "react";
import { api, useApi } from "@/lib/client";

type SlotId = "elci-tr" | "elci-en" | "speaker-tr";
type Slots = Record<SlotId, { url: string; custom: boolean }>;

const CARDS: { id: SlotId; title: string; note: string }[] = [
  {
    id: "elci-tr",
    title: "Elçi kabul belgesi · Türkçe",
    note: "Ad ve okul boş satırlara lacivert yazılır. Yeni zeminde de iki boş satır aynı yerde kalsın.",
  },
  {
    id: "elci-en",
    title: "Elçi kabul belgesi · English",
    note: "Same layout as the Turkish card. The name and school are written on the two blank lines.",
  },
  {
    id: "speaker-tr",
    title: "Konuşmacı panel afişi",
    note: "Hazır şablon davetiye düzenidir. Başlık, tarih, saat, yer ve portreler panel kaydından yazılır. Yeni şablonda bu boş alanlar aynı yerde kalsın.",
  },
];

export default function CardBackgroundsPage() {
  const { data, reload } = useApi<{ slots: Slots }>("/api/public/card-backgrounds");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");

  async function upload(slot: SlotId, file: File) {
    setBusy(slot);
    setMsg("");
    try {
      const body = new FormData();
      body.set("slot", slot);
      body.set("file", file);
      await api("/api/cards/background", { method: "POST", body });
      await reload();
      setMsg("Arka plan yüklendi");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Yüklenemedi");
    } finally {
      setBusy("");
    }
  }

  async function reset(slot: SlotId) {
    setBusy(slot);
    setMsg("");
    try {
      const body = new FormData();
      body.set("slot", slot);
      body.set("reset", "1");
      await api("/api/cards/background", { method: "POST", body });
      await reload();
      setMsg("Hazır zemin geri geldi");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Sıfırlanamadı");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="display text-4xl">Kart arka planları</h1>
      <p className="text-[#57534e]">
        Kabul belgesi dile göre değişir. Konuşmacı paneli tek bir şablon kullanır; hazır davetiye durur, yerine kendi görselinizi yükleyebilirsiniz. Dosya JPG, PNG veya WebP olabilir, en fazla 8 MB.
      </p>
      {msg ? <p className="text-sm text-[#0077C2]">{msg}</p> : null}
      <div className="grid md:grid-cols-2 gap-4">
        {CARDS.map((card) => {
          const row = data?.slots?.[card.id];
          return (
            <section key={card.id} className="card p-4 space-y-3">
              <h2 className="display text-2xl">{card.title}</h2>
              <p className="text-sm text-[#57534e]">{card.note}</p>
              {row?.url ? (
                <img src={row.url} alt="" className="w-full max-h-80 object-contain bg-[#EEF8FD] border border-[#B5DFF2]" />
              ) : (
                <div className="h-40 grid place-items-center text-sm border border-[#B5DFF2] bg-[#0B1C33] text-[#EEF8FD]">
                  Hazır lacivert kart
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <label className={`btn cursor-pointer ${busy === card.id ? "opacity-60" : ""}`}>
                  {row?.custom ? "Değiştir" : "Arka plan yükle"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    disabled={busy === card.id}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (file) void upload(card.id, file);
                    }}
                  />
                </label>
                {row?.custom ? (
                  <button className="btn ghost" type="button" disabled={busy === card.id} onClick={() => void reset(card.id)}>
                    Hazır zemine dön
                  </button>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
