"use client";

import { FormEvent, useState } from "react";
import { api, useApi } from "@/lib/client";

type Log = { id: string; delta: number; quantity: number; note: string; actor: string; createdAt: string };
type Item = { id: string; kind: string; title: string; unit: string; quantity: number; note: string; logs: Log[] };

const KIND: Record<string, string> = { esantiyon: "Eşantiyon", ikram: "İkram" };

function when(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function StockDesk({ canEdit }: { canEdit: boolean }) {
  const { data, reload } = useApi<{ items: Item[] }>("/api/stock");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("esantiyon");
  const [quantity, setQuantity] = useState("0");
  const [unit, setUnit] = useState("adet");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function run(id: string, payload: Record<string, unknown>) {
    setBusy(id);
    setError("");
    try {
      await api("/api/stock", { method: "POST", body: JSON.stringify(payload) });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydedilemedi");
    } finally {
      setBusy("");
    }
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    await run("create", { action: "create", title, kind, quantity: Number(quantity), unit, note });
    setTitle("");
    setQuantity("0");
    setNote("");
  }

  const items = data?.items || [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="display text-4xl">Eşantiyon ve ikram stoku</h1>
        <p className="text-[#57534e]">
          {canEdit
            ? "Stok girişini admin yapar. Elçiler dağıttıkları adedi buradan düşer."
            : "Dağıttığınız adedi düşün. Yeni stok girişini admin yapar."}
        </p>
      </div>
      {error ? <p className="text-sm text-[#E31C23]">{error}</p> : null}
      {canEdit ? (
        <form className="card p-4 grid sm:grid-cols-2 gap-2" onSubmit={(e) => void create(e)}>
          <label className="text-sm">Ad
            <input className="field mt-1" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <label className="text-sm">Tür
            <select className="field mt-1" value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="esantiyon">Eşantiyon</option>
              <option value="ikram">İkram</option>
            </select>
          </label>
          <label className="text-sm">İlk adet
            <input className="field mt-1" type="number" min={0} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </label>
          <label className="text-sm">Birim
            <input className="field mt-1" value={unit} onChange={(e) => setUnit(e.target.value)} />
          </label>
          <label className="text-sm sm:col-span-2">Not
            <input className="field mt-1" value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <button className="btn" disabled={busy === "create"}>Stoğa ekle</button>
        </form>
      ) : null}
      {!data ? <p>Yükleniyor…</p> : null}
      {data && items.length === 0 ? <p className="card p-4 text-sm text-[#3E6A88]">Henüz stok girilmedi.</p> : null}
      <div className="space-y-3">
        {items.map((item) => (
          <article key={item.id} className="card p-4 space-y-3">
            <div className="flex justify-between gap-3 flex-wrap">
              <div>
                <div className="text-xs tracking-[0.14em] uppercase text-[#0077C2]">{KIND[item.kind] || item.kind}</div>
                <h2 className="display text-2xl">{item.title}</h2>
                {item.note ? <p className="text-sm text-[#3E6A88]">{item.note}</p> : null}
              </div>
              <div className="text-right">
                <div className="display text-4xl leading-none">{item.quantity}</div>
                <div className="text-xs text-[#3E6A88]">{item.unit} kaldı</div>
              </div>
            </div>
            <form
              className="flex flex-wrap gap-2 items-end"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const amount = Number(fd.get("amount") || 0);
                const rowNote = String(fd.get("note") || "");
                void run(item.id + (canEdit ? "-add" : "-use"), {
                  action: canEdit && fd.get("mode") === "add" ? "add" : "use",
                  id: item.id,
                  amount,
                  note: rowNote,
                });
                e.currentTarget.reset();
              }}
            >
              {canEdit ? (
                <select className="field w-36" name="mode" defaultValue="add">
                  <option value="add">Stok ekle</option>
                  <option value="use">Stoktan düş</option>
                </select>
              ) : null}
              <label className="text-sm">Adet
                <input className="field mt-1 w-28" name="amount" type="number" min={1} required defaultValue={1} />
              </label>
              <label className="text-sm flex-1 min-w-[180px]">Not
                <input className="field mt-1" name="note" placeholder={canEdit ? "Nereden geldi" : "Nereye dağıtıldı"} />
              </label>
              <button className="btn" disabled={busy.startsWith(item.id)}>{canEdit ? "Kaydet" : "Stoktan düş"}</button>
            </form>
            {item.logs.length ? (
              <ul className="text-xs text-[#3E6A88] space-y-1">
                {item.logs.map((log) => (
                  <li key={log.id}>
                    {when(log.createdAt)} · {log.actor} · {log.delta > 0 ? `+${log.delta}` : log.delta} · kalan {log.quantity}
                    {log.note ? ` · ${log.note}` : ""}
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
