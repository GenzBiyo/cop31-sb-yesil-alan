"use client";

import { QrImage, usePublicOrigin } from "@/components/QrImage";
import { useState } from "react";
import { api, formatDate, useApi } from "@/lib/client";
import { useI18n } from "@/components/I18nProvider";

type Ev = {
  id: string;
  slug: string;
  title: string;
  type: string;
  companyName: string;
  topic: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  description: string;
  gift: string;
  config: string;
  published: boolean;
  _count?: { signups: number };
};

const TYPES = [
  { id: "gift-qa", label: "Hediyeli soru-cevap" },
  { id: "quiz", label: "Bilgi yarışması" },
  { id: "survey", label: "İnteraktif anket" },
  { id: "wheel", label: "Dijital çark" },
  { id: "interactive", label: "İnteraktif deneyim" },
];

export default function EventsAdminPage() {
  const { tx } = useI18n();
  const { data, reload } = useApi<Ev[]>("/api/events");
  const [open, setOpen] = useState<Ev | null>(null);
  const [form, setForm] = useState({
    title: "",
    type: "survey",
    companyName: "",
    topic: "",
    date: "2026-11-09",
    startTime: "10:00",
    endTime: "18:00",
    location: "Sağlık Pavilionu",
    gift: "",
    description: "",
  });
  const origin = usePublicOrigin();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="display text-4xl">{tx("Etkinlikler")}</h1>
        <p className="text-[#57534e]">Panellerden ayrı: hediyeli S-C, anket, çark ve interaktif oyunlar. QR ile kayıt; elçiler sahada toplar. Yalnızca admin ve SB düzenler.</p>
      </div>
      <form
        className="card p-4 grid md:grid-cols-4 gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          await api("/api/events", { method: "POST", body: JSON.stringify(form) });
          await reload();
        }}
      >
        <input className="field md:col-span-2" placeholder="Başlık" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <select className="field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          {TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <input className="field" placeholder="Firma" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
        <input className="field" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <input className="field" placeholder="Konu" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
        <input className="field" placeholder="Hediye" value={form.gift} onChange={(e) => setForm({ ...form, gift: e.target.value })} />
        <button className="btn">Etkinlik ekle</button>
      </form>
      <div className="space-y-2">
        {(data || []).map((ev) => (
          <button key={ev.id} className="card p-4 w-full text-left" onClick={() => setOpen(ev)}>
            <div className="flex justify-between gap-2">
              <div>
                <div className="text-xs text-[#0077C2]">{TYPES.find((t) => t.id === ev.type)?.label} · {formatDate(ev.date)}</div>
                <div className="display text-2xl">{ev.title}</div>
                <div className="text-sm text-[#57534e]">{ev.companyName} · {ev.location} · {ev._count?.signups || 0} kayıt</div>
              </div>
              <span className={`badge ${ev.published ? "ok" : "muted"}`}>{ev.published ? "Yayında" : "Taslak"}</span>
            </div>
          </button>
        ))}
      </div>
      {open ? (
        <div className="card p-5 space-y-3">
          <div className="flex justify-between">
            <h2 className="display text-3xl">{open.title}</h2>
            <button className="btn ghost" onClick={() => setOpen(null)}>Kapat</button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <label className="text-sm">Başlık<input className="field mt-1" defaultValue={open.title} onBlur={(e) => patch(open.id, { title: e.target.value }, reload)} /></label>
            <label className="text-sm">Firma<input className="field mt-1" defaultValue={open.companyName} onBlur={(e) => patch(open.id, { companyName: e.target.value }, reload)} /></label>
            <label className="text-sm">Konu<input className="field mt-1" defaultValue={open.topic} onBlur={(e) => patch(open.id, { topic: e.target.value }, reload)} /></label>
            <label className="text-sm">Hediye<input className="field mt-1" defaultValue={open.gift} onBlur={(e) => patch(open.id, { gift: e.target.value }, reload)} /></label>
            <label className="text-sm">Tarih<input className="field mt-1" type="date" defaultValue={open.date} onBlur={(e) => patch(open.id, { date: e.target.value }, reload)} /></label>
            <label className="text-sm">Yer<input className="field mt-1" defaultValue={open.location} onBlur={(e) => patch(open.id, { location: e.target.value }, reload)} /></label>
            <label className="text-sm md:col-span-2">Açıklama<textarea className="field mt-1" defaultValue={open.description} onBlur={(e) => patch(open.id, { description: e.target.value }, reload)} /></label>
            <label className="text-sm md:col-span-2">İçerik (JSON: sorular / çark dilimleri)
              <textarea className="field mt-1 font-mono text-xs" rows={10} defaultValue={pretty(open.config)} onBlur={(e) => patch(open.id, { config: e.target.value }, reload)} />
            </label>
          </div>
          <label className="text-sm flex items-center gap-2">
            <input type="checkbox" defaultChecked={open.published} onChange={(e) => patch(open.id, { published: e.target.checked }, reload)} />
            Yayında (QR açılır)
          </label>
          <div className="flex flex-wrap gap-4 items-start">
            <QrCard label="Ziyaretçi QR" path={`/e/${open.slug}`} origin={origin} />
            <QrCard label="Elçi kayıt QR" path={`/e/${open.slug}?elci=Iklim+Saglik+Elcisi`} origin={origin} />
            <a className="btn ghost" href={`/e/${open.slug}`} target="_blank">Önizle</a>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function pretty(raw: string) {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

async function patch(id: string, body: Record<string, unknown>, reload: () => Promise<void>) {
  await api(`/api/events/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  await reload();
}

function QrCard({ label, path, origin }: { label: string; path: string; origin: string }) {
  return (
    <div className="text-center">
      <QrImage path={path} alt={label} size={160} />
      <div className="text-xs mt-1">{label}</div>
      <div className="text-[10px] text-[#57534e] break-all">{origin}{path}</div>
    </div>
  );
}
