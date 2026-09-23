"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { api, formatDate, useApi, useRealtime } from "@/lib/client";
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from "@/lib/constants";
import { useI18n } from "@/components/I18nProvider";

type Todo = {
  id: string;
  no: number;
  workPackage: string;
  activity: string;
  detail: string;
  startDate: string;
  dueDate: string;
  unit: string;
  owner: string;
  status: string;
  progress: number;
  risk: string;
  remainingDays: number | null;
  priority: string;
  notes: string;
};

export default function TodosPage() {
  const { tx } = useI18n();
  const { data, reload, loading } = useApi<Todo[]>("/api/todos");
  const [q, setQ] = useState("");
  const [pack, setPack] = useState("Tümü");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [edit, setEdit] = useState<Todo | null>(null);

  useRealtime(() => {
    void reload();
  });

  const packages = useMemo(() => ["Tümü", ...Array.from(new Set((data || []).map((t) => t.workPackage)))], [data]);
  const rows = (data || []).filter((t) => {
    if (pack !== "Tümü" && t.workPackage !== pack) return false;
    if (!q) return true;
    const hay = `${t.activity} ${t.detail} ${t.unit} ${t.owner} ${t.notes}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  async function sync(source: "google" | "local") {
    setBusy(true);
    setMsg("");
    try {
      const res = await api<{ todos: { updated: number; created: number } }>(`/api/sheets/sync`, {
        method: "POST",
        body: JSON.stringify({ source }),
      });
      setMsg(`Excel senkron: ${res.todos.updated} güncellendi, ${res.todos.created} eklendi.`);
      await reload();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Senkron hatası");
    } finally {
      setBusy(false);
    }
  }

  async function upload(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    setBusy(true);
    try {
      await fetch("/api/sheets/upload", { method: "POST", body: fd });
      setMsg("Yüklenen Excel içeri aktarıldı.");
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!edit) return;
    await api(`/api/todos/${edit.id}`, { method: "PATCH", body: JSON.stringify(edit) });
    setEdit(null);
    await reload();
  }

  const done = (data || []).filter((t) => t.status === "Tamamlandı").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="display text-4xl">{tx("SB hazırlık to-do")}</h1>
          <p className="text-[#57534e]">Google Sheet ile bağlı kontrol listesi · {done}/{data?.length || 0} tamamlandı</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn" disabled={busy} onClick={() => sync("google")}>Excel&apos;den çek</button>
          <button className="btn secondary" disabled={busy} onClick={() => sync("local")}>Yerel kopyadan çek</button>
          <a className="btn ghost" href="/api/sheets/export">Excel indir</a>
          <button className="btn ghost" onClick={() => fileRef.current?.click()}>Excel yükle</button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </div>
      </div>
      {msg ? <p className="text-sm text-[#0077C2]">{msg}</p> : null}
      <div className="flex flex-wrap gap-2">
        <input className="field max-w-xs" placeholder="Ara" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="field max-w-sm" value={pack} onChange={(e) => setPack(e.target.value)}>
          {packages.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <button
          className="btn secondary"
          onClick={async () => {
            await api("/api/todos", { method: "POST", body: JSON.stringify({ activity: "Yeni faaliyet", workPackage: pack === "Tümü" ? "Genel Koordinasyon" : pack }) });
            await reload();
          }}
        >
          Satır ekle
        </button>
      </div>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>No</th>
              <th>İş paketi</th>
              <th>Faaliyet</th>
              <th>Tarih</th>
              <th>Sorumlu</th>
              <th>Durum</th>
              <th>%</th>
              <th>Kalan</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9}>Yükleniyor…</td></tr>
            ) : (
              rows.map((t) => (
                <tr key={t.id}>
                  <td>{t.no}</td>
                  <td className="whitespace-nowrap">{t.workPackage}</td>
                  <td>
                    <div>{t.activity}</div>
                    <div className="text-xs text-[#57534e]">{t.detail}</div>
                  </td>
                  <td className="whitespace-nowrap">{formatDate(t.startDate)} → {formatDate(t.dueDate)}</td>
                  <td>
                    <div>{t.unit}</div>
                    <div className="text-xs">{t.owner}</div>
                  </td>
                  <td>
                    <span className={`badge ${t.status === "Tamamlandı" ? "ok" : t.risk ? "high" : t.status === "Devam Ediyor" ? "warn" : "muted"}`}>
                      {t.status}
                    </span>
                    {t.priority === "Yüksek" ? <div className="text-xs text-[#0077C2] mt-1">Yüksek</div> : null}
                  </td>
                  <td>{t.progress}</td>
                  <td>{t.remainingDays ?? "—"}</td>
                  <td>
                    <button className="btn ghost" onClick={() => setEdit(t)}>Düzenle</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {edit ? (
        <form className="card p-4 grid md:grid-cols-2 gap-3" onSubmit={save}>
          <h2 className="display text-2xl md:col-span-2">Faaliyet {edit.no}</h2>
          <label className="text-sm">Faaliyet<input className="field mt-1" value={edit.activity} onChange={(e) => setEdit({ ...edit, activity: e.target.value })} /></label>
          <label className="text-sm">İş paketi<input className="field mt-1" value={edit.workPackage} onChange={(e) => setEdit({ ...edit, workPackage: e.target.value })} /></label>
          <label className="text-sm md:col-span-2">Açıklama<textarea className="field mt-1" rows={3} value={edit.detail} onChange={(e) => setEdit({ ...edit, detail: e.target.value })} /></label>
          <label className="text-sm">Başlangıç<input className="field mt-1" type="date" value={edit.startDate} onChange={(e) => setEdit({ ...edit, startDate: e.target.value })} /></label>
          <label className="text-sm">Bitiş<input className="field mt-1" type="date" value={edit.dueDate} onChange={(e) => setEdit({ ...edit, dueDate: e.target.value })} /></label>
          <label className="text-sm">Birim<input className="field mt-1" value={edit.unit} onChange={(e) => setEdit({ ...edit, unit: e.target.value })} /></label>
          <label className="text-sm">Kişi<input className="field mt-1" value={edit.owner} onChange={(e) => setEdit({ ...edit, owner: e.target.value })} /></label>
          <label className="text-sm">Durum
            <select className="field mt-1" value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>
              {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label className="text-sm">Öncelik
            <select className="field mt-1" value={edit.priority} onChange={(e) => setEdit({ ...edit, priority: e.target.value })}>
              {PRIORITY_OPTIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label className="text-sm">Tamamlanma %<input className="field mt-1" type="number" min={0} max={100} value={edit.progress} onChange={(e) => setEdit({ ...edit, progress: Number(e.target.value) })} /></label>
          <label className="text-sm">Notlar<input className="field mt-1" value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></label>
          <div className="md:col-span-2 flex gap-2">
            <button className="btn">Kaydet</button>
            <button type="button" className="btn ghost" onClick={() => setEdit(null)}>Vazgeç</button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
