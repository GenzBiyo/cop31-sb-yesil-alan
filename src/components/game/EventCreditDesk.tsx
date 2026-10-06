"use client";

import { useState } from "react";
import { api, useApi } from "@/lib/client";
import { DEFAULT_CREDIT_AFTER, DEFAULT_CREDIT_BEFORE, type EventCredit } from "@/lib/event-credits";

const BLANK = {
  name: "",
  before: DEFAULT_CREDIT_BEFORE,
  after: DEFAULT_CREDIT_AFTER,
  from: "",
  to: "",
};

export function EventCreditDesk() {
  const { data, reload } = useApi<{ credits: EventCredit[] }>("/api/event-credits");
  const [form, setForm] = useState(BLANK);
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const credits = data?.credits || [];

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return setMsg("Logo seçin");
    setBusy(true);
    setMsg("");
    try {
      const body = new FormData();
      body.set("name", form.name);
      body.set("before", form.before);
      body.set("after", form.after);
      body.set("from", form.from);
      body.set("to", form.to);
      body.set("file", file);
      await api("/api/event-credits", { method: "POST", body });
      setForm(BLANK);
      setFile(null);
      await reload();
      setMsg("Sponsor satırı kaydedildi");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Kaydedilemedi");
    } finally {
      setBusy(false);
    }
  }

  async function save(row: EventCredit, patch: Partial<EventCredit>, nextFile?: File | null) {
    setMsg("");
    const body = new FormData();
    body.set("name", patch.name ?? row.name);
    body.set("before", patch.before ?? row.before);
    body.set("after", patch.after ?? row.after);
    body.set("from", patch.from ?? row.from);
    body.set("to", patch.to ?? row.to);
    if (nextFile) body.set("file", nextFile);
    try {
      await api(`/api/event-credits/${row.id}`, { method: "PATCH", body });
      await reload();
      setMsg("Güncellendi");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Güncellenemedi");
    }
  }

  async function remove(row: EventCredit) {
    if (!confirm("Bu sponsor satırı silinsin mi?")) return;
    await api(`/api/event-credits/${row.id}`, { method: "DELETE" });
    await reload();
  }

  return (
    <section className="card p-4 space-y-4" style={{ borderLeft: "4px solid #0077C2" }}>
      <div>
        <h2 className="display text-2xl">Oyun altı etkinlik sponsoru</h2>
        <p className="text-sm text-[#57534e]">
          Oyunların altında “yazı, logo, yazı” olarak görünür. Örnek: Katıldığınız bu etkinlik [logo] tarafından desteklenmiştir. Yalnızca seçtiğiniz saat aralığında yayında kalır. Saatler Antalya saatidir.
        </p>
      </div>
      <form className="grid md:grid-cols-2 gap-2" onSubmit={create}>
        <label className="text-sm">Logo öncesi yazı
          <input className="field mt-1" value={form.before} onChange={(e) => setForm({ ...form, before: e.target.value })} required />
        </label>
        <label className="text-sm">Logo sonrası yazı
          <input className="field mt-1" value={form.after} onChange={(e) => setForm({ ...form, after: e.target.value })} placeholder="Boş bırakılırsa yalnızca logo kalır" />
        </label>
        <label className="text-sm">Sponsor adı
          <input className="field mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Logo alt yazısı" />
        </label>
        <label className="text-sm">Logo
          <input className="field mt-1" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </label>
        <label className="text-sm">Başlangıç
          <input className="field mt-1" type="datetime-local" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} required />
        </label>
        <label className="text-sm">Bitiş
          <input className="field mt-1" type="datetime-local" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} required />
        </label>
        <div className="md:col-span-2 flex flex-wrap items-center gap-3">
          <button className="btn" disabled={busy}>{busy ? "Kaydediliyor…" : "Sponsor satırı ekle"}</button>
          {msg ? <span className="text-sm text-[#0077C2]">{msg}</span> : null}
        </div>
      </form>
      <ul className="space-y-3">
        {credits.map((row) => (
          <CreditRow key={row.id} row={row} onSave={save} onRemove={remove} />
        ))}
        {credits.length === 0 ? <li className="text-sm text-[#57534e]">Henüz sponsor satırı yok.</li> : null}
      </ul>
    </section>
  );
}

function CreditRow({
  row,
  onSave,
  onRemove,
}: {
  row: EventCredit;
  onSave: (row: EventCredit, patch: Partial<EventCredit>, file?: File | null) => Promise<void>;
  onRemove: (row: EventCredit) => Promise<void>;
}) {
  const [draft, setDraft] = useState(row);
  const [file, setFile] = useState<File | null>(null);
  return (
    <li className="border border-[#DCE8F0] p-3 grid md:grid-cols-[120px_1fr] gap-3 items-center">
      <img src={row.logoPath} alt={row.name || "Sponsor"} className="max-h-16 max-w-[120px] object-contain bg-white" />
      <div className="grid md:grid-cols-2 gap-2">
        <input className="field" value={draft.before} onChange={(e) => setDraft({ ...draft, before: e.target.value })} />
        <input className="field" value={draft.after} onChange={(e) => setDraft({ ...draft, after: e.target.value })} />
        <input className="field" type="datetime-local" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} />
        <input className="field" type="datetime-local" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
        <input className="field" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <div className="flex gap-2">
          <button type="button" className="btn" onClick={() => void onSave(row, draft, file)}>Kaydet</button>
          <button type="button" className="btn ghost" onClick={() => void onRemove(row)}>Sil</button>
        </div>
      </div>
    </li>
  );
}
