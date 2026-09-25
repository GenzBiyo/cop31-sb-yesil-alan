"use client";

import { QrImage, usePublicOrigin } from "@/components/QrImage";
import { useMemo, useState } from "react";
import { api, formatDate, useApi } from "@/lib/client";
import { useI18n } from "@/components/I18nProvider";
import { COP_DAY_OPTIONS } from "@/lib/cop-days";
import {
  availableSlots,
  isYouthType,
  slotByStart,
  typesForSlot,
  type Occupied,
} from "@/lib/event-slots";

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
  approvalStatus?: string;
  companyId?: string;
  _count?: { signups: number };
};

const TYPE_LABEL: Record<string, string> = {
  "gift-qa": "Hediyeli soru-cevap",
  quiz: "Soru-cevap",
  survey: "İnteraktif anket",
  wheel: "Dijital çark",
  interactive: "İnteraktif deneyim",
  match: "Hafıza / eşleştirme",
  kilo: "Kilo karbon",
  hatira: "Hatıra fotoğrafı",
};

export default function EventsAdminPage() {
  const { tx } = useI18n();
  const { data, reload } = useApi<Ev[]>("/api/events");
  const { data: me } = useApi<{ role: string }>("/api/auth/me");
  const canReview = me?.role === "ADMIN" || me?.role === "SAGLIK";
  const isFirma = me?.role === "FIRMA";
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    type: "survey",
    companyName: "",
    topic: "",
    date: "2026-11-09",
    startTime: "09:00",
    endTime: "10:00",
    location: "Sağlık Pavilionu",
    gift: "",
    description: "",
  });
  const origin = usePublicOrigin();
  const occupied = useMemo<Occupied[]>(
    () =>
      (data || []).map((e) => ({
        id: e.id,
        date: e.date,
        startTime: e.startTime,
        endTime: e.endTime,
        approvalStatus: e.approvalStatus,
      })),
    [data]
  );
  const [error, setError] = useState("");

  function slotLabel(start: string) {
    const slot = slotByStart(start);
    if (!slot) return start;
    return slot.kind === "youth"
      ? `${slot.start}–${slot.end} · ${tx("Gençlik saati")}`
      : `${slot.start}–${slot.end}`;
  }

  function applySlot(next: { date?: string; startTime?: string; type?: string }) {
    const date = next.date ?? form.date;
    let start = next.startTime ?? form.startTime;
    const free = availableSlots(date, occupied);
    if (next.date && !free.some((s) => s.start === start)) start = free[0]?.start || start;
    const slot = slotByStart(start);
    const kind = slot?.kind || "normal";
    let type = next.type ?? form.type;
    const allowed = typesForSlot(kind);
    if (!allowed.includes(type)) type = allowed[0];
    setForm({
      ...form,
      ...next,
      date,
      startTime: slot?.start || start,
      endTime: slot?.end || "10:00",
      type,
    });
  }

  async function removeEvent(id: string) {
    if (!confirm(tx("Bu etkinliği silmek istiyor musunuz?"))) return;
    await api(`/api/events/${id}`, { method: "DELETE" });
    if (openId === id) setOpenId(null);
    await reload();
  }

  async function publishEvent(ev: Ev) {
    if (ev.approvalStatus === "Onay bekliyor") {
      await api(`/api/events/${ev.id}`, { method: "PATCH", body: JSON.stringify({ review: "approve" }) });
    } else {
      await patch(ev.id, { published: !ev.published }, reload);
      return;
    }
    await reload();
  }

  function EventActions({ ev }: { ev: Ev }) {
    return (
      <div className="flex flex-wrap gap-2">
        <a className="btn ghost" href={`/e/${ev.slug}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
          {tx("Ön izle")}
        </a>
        {canReview ? (
          <button
            className={ev.published ? "btn ghost" : "btn"}
            onClick={(e) => {
              e.stopPropagation();
              void publishEvent(ev);
            }}
          >
            {ev.published ? tx("Yayından al") : tx("Yayınla")}
          </button>
        ) : null}
        {canReview || (isFirma && ev.approvalStatus === "Onay bekliyor") ? (
          <button
            className="btn ghost"
            style={{ color: "#E31C23" }}
            onClick={(e) => {
              e.stopPropagation();
              void removeEvent(ev.id);
            }}
          >
            {tx("Sil")}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="display text-4xl">{tx("Etkinlikler")}</h1>
        <p className="text-[#57534e]">
          {isFirma
            ? tx("Etkinlik önerin. Sağlık Bakanlığı onaylayınca QR açılır ve programa düşer.")
            : tx("Slotlar 1 saattir. 16:00’a kadar normal etkinlik; 17:00’den sonra yalnızca gençlik oyunları.")}
        </p>
      </div>
      <form
        className="card p-4 grid md:grid-cols-4 gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          try {
            await api("/api/events", { method: "POST", body: JSON.stringify(form) });
            setForm({ ...form, title: "", topic: "", gift: "" });
            await reload();
          } catch (err) {
            setError(err instanceof Error ? err.message : tx("Kayıt alınamadı"));
          }
        }}
      >
        <input className="field md:col-span-2" placeholder="Başlık" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <select className="field" value={form.type} onChange={(e) => applySlot({ type: e.target.value })}>
          {typesForSlot(slotByStart(form.startTime)?.kind || "normal").map((id) => (
            <option key={id} value={id}>{tx(TYPE_LABEL[id] || id)}</option>
          ))}
        </select>
        <input className="field" placeholder="Firma" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
        <select className="field" value={form.date} onChange={(e) => applySlot({ date: e.target.value })}>
          {COP_DAY_OPTIONS.map((d) => (
            <option key={d.date} value={d.date}>{d.label}</option>
          ))}
        </select>
        <select className="field md:col-span-2" value={form.startTime} onChange={(e) => applySlot({ startTime: e.target.value })}>
          {availableSlots(form.date, occupied).map((s) => (
            <option key={s.start} value={s.start}>{slotLabel(s.start)}</option>
          ))}
        </select>
        <input className="field" placeholder="Konu" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
        <input className="field" placeholder="Hediye" value={form.gift} onChange={(e) => setForm({ ...form, gift: e.target.value })} />
        {error ? <p className="text-sm text-[#E31C23] md:col-span-4">{error}</p> : null}
        <button className="btn">{isFirma ? tx("SB'ye öner") : "Etkinlik ekle"}</button>
      </form>
      {(data || []).some((ev) => ev.approvalStatus === "Onay bekliyor") ? (
        <section className="card p-4 space-y-3">
          <h2 className="display text-2xl">{tx("Firma önerileri")}</h2>
          <p className="text-sm text-[#57534e]">{tx("Onaylanınca ana programa ve gündeme işlenir.")}</p>
          {(data || [])
            .filter((ev) => ev.approvalStatus === "Onay bekliyor")
            .map((ev) => (
              <div key={ev.id} className="border border-[#B5DFF2] p-3 space-y-2">
                <div className="flex justify-between gap-2 flex-wrap">
                  <div>
                    <div className="text-xs text-[#0077C2]">{tx(TYPE_LABEL[ev.type] || ev.type)} · {formatDate(ev.date)}</div>
                    <div className="font-semibold">{ev.title}</div>
                    <div className="text-sm text-[#57534e]">{ev.companyName} · {ev.topic || ev.gift}</div>
                  </div>
                  <span className="badge warn">{tx("Onay bekliyor")}</span>
                </div>
                <EventActions ev={ev} />
              </div>
            ))}
        </section>
      ) : null}
      <div className="space-y-2">
        {(data || [])
          .filter((ev) => ev.approvalStatus !== "Onay bekliyor")
          .map((ev) => (
          <div key={ev.id} className="space-y-2">
            <div className={`card p-4 ${openId === ev.id ? "ring-2 ring-[#00A3E0]" : ""}`}>
              <div className="flex justify-between gap-2 items-start">
                <button
                  className="text-left flex-1 min-w-0"
                  onClick={() => {
                    if (!canReview && !(isFirma && ev.approvalStatus === "Onay bekliyor")) return;
                    setOpenId((id) => (id === ev.id ? null : ev.id));
                  }}
                >
                  <div className="text-xs text-[#0077C2]">{tx(TYPE_LABEL[ev.type] || ev.type)} · {formatDate(ev.date)} · {ev.startTime}–{ev.endTime}{isYouthType(ev.type) || slotByStart(ev.startTime)?.kind === "youth" ? ` · ${tx("Gençlik saati")}` : ""}</div>
                  <div className="display text-2xl">{ev.title}</div>
                  <div className="text-sm text-[#57534e]">{ev.companyName} · {ev.location} · {ev._count?.signups || 0} kayıt</div>
                </button>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`badge ${ev.published ? "ok" : "muted"}`}>
                    {ev.approvalStatus === "Reddedildi" ? tx("Reddedildi") : ev.published ? tx("Yayında") : tx("Taslak")}
                  </span>
                  <EventActions ev={ev} />
                </div>
              </div>
            </div>
            {openId === ev.id ? (
              <div className="card p-5 space-y-3 ml-0 md:ml-4 border-[#00A3E0]">
                <div className="flex justify-between">
                  <h2 className="display text-3xl">{ev.title}</h2>
                  <button className="btn ghost" onClick={() => setOpenId(null)}>Kapat</button>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <label className="text-sm">Başlık<input className="field mt-1" defaultValue={ev.title} onBlur={(e) => patch(ev.id, { title: e.target.value }, reload)} /></label>
                  <label className="text-sm">Firma<input className="field mt-1" defaultValue={ev.companyName} onBlur={(e) => patch(ev.id, { companyName: e.target.value }, reload)} /></label>
                  <label className="text-sm">Konu<input className="field mt-1" defaultValue={ev.topic} onBlur={(e) => patch(ev.id, { topic: e.target.value }, reload)} /></label>
                  <label className="text-sm">Hediye<input className="field mt-1" defaultValue={ev.gift} onBlur={(e) => patch(ev.id, { gift: e.target.value }, reload)} /></label>
                  <label className="text-sm">Tarih
                    <select className="field mt-1" defaultValue={ev.date} onChange={(e) => {
                      const date = e.target.value;
                      const free = availableSlots(date, occupied, ev.id);
                      const start = free.some((s) => s.start === ev.startTime) ? ev.startTime : free[0]?.start;
                      const slot = slotByStart(start || ev.startTime);
                      void patch(ev.id, { date, startTime: slot?.start, endTime: slot?.end }, reload);
                    }}>
                      {COP_DAY_OPTIONS.map((d) => (
                        <option key={d.date} value={d.date}>{d.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm">Saat
                    <select className="field mt-1" value={ev.startTime} onChange={(e) => {
                      const slot = slotByStart(e.target.value);
                      if (!slot) return;
                      const type = typesForSlot(slot.kind).includes(ev.type) ? ev.type : typesForSlot(slot.kind)[0];
                      void patch(ev.id, { startTime: slot.start, endTime: slot.end, type }, reload);
                    }}>
                      {availableSlots(ev.date, occupied, ev.id).map((s) => (
                        <option key={s.start} value={s.start}>{slotLabel(s.start)}</option>
                      ))}
                      {availableSlots(ev.date, occupied, ev.id).some((s) => s.start === ev.startTime) ? null : (
                        <option value={ev.startTime}>{slotLabel(ev.startTime)}</option>
                      )}
                    </select>
                  </label>
                  <label className="text-sm">Tür
                    <select className="field mt-1" value={ev.type} onChange={(e) => patch(ev.id, { type: e.target.value }, reload)}>
                      {typesForSlot(slotByStart(ev.startTime)?.kind || "normal").map((id) => (
                        <option key={id} value={id}>{tx(TYPE_LABEL[id] || id)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm">Yer<input className="field mt-1" defaultValue={ev.location} onBlur={(e) => patch(ev.id, { location: e.target.value }, reload)} /></label>
                  <label className="text-sm md:col-span-2">Açıklama<textarea className="field mt-1" defaultValue={ev.description} onBlur={(e) => patch(ev.id, { description: e.target.value }, reload)} /></label>
                  <label className="text-sm md:col-span-2">İçerik (JSON: sorular / çark dilimleri)
                    <textarea className="field mt-1 font-mono text-xs" rows={10} defaultValue={pretty(ev.config)} onBlur={(e) => patch(ev.id, { config: e.target.value }, reload)} />
                  </label>
                </div>
                {canReview && ev.approvalStatus === "Onay bekliyor" ? (
                  <div className="flex gap-2">
                    <button className="btn" onClick={async () => { await api(`/api/events/${ev.id}`, { method: "PATCH", body: JSON.stringify({ review: "approve" }) }); await reload(); }}>{tx("Onayla")}</button>
                    <button className="btn ghost" onClick={async () => { await api(`/api/events/${ev.id}`, { method: "PATCH", body: JSON.stringify({ review: "reject" }) }); await reload(); }}>{tx("Reddet")}</button>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-4 items-start">
                  <QrCard label="Ziyaretçi QR" path={`/e/${ev.slug}`} origin={origin} />
                  <QrCard label="Elçi kayıt QR" path={`/e/${ev.slug}?elci=Iklim+Saglik+Elcisi`} origin={origin} />
                </div>
                <EventActions ev={ev} />
              </div>
            ) : null}
          </div>
        ))}
      </div>
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
