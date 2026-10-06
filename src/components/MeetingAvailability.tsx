"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarDays, Check, Trash2, X } from "lucide-react";
import { api, useApi, useRealtime } from "@/lib/client";
import { useI18n } from "@/components/I18nProvider";
import { COP_DATES, copDayMeta } from "@/lib/cop-days";
import { formatParticipationDays, participationDays } from "@/lib/participation";
import { ParticipationDays } from "@/components/ParticipationDays";

type Slot = { id: string; date: string; startTime: string; endTime: string; location: string; state: "bos" | "bekliyor" | "dolu"; pending: number };
type Meeting = {
  id: string;
  kind: string;
  topic: string;
  message: string;
  status: string;
  slotId: string;
  preferredDate: string;
  preferredTime: string;
  whenDate: string;
  startTime: string;
  endTime: string;
  location: string;
  note: string;
  fromName: string;
  fromOrganization: string;
  fromEmail: string;
  fromPhone: string;
};

const DURATIONS = [15, 20, 30, 45, 60, 90];

function dayLabel(date: string) {
  const m = copDayMeta(date);
  return `${m.day} Kas · ${m.weekdayShort}`;
}

type CompanyDays = { id: string; participationDates: string; formHint?: { days: string[] } | null };

export function MeetingAvailability({ company, onCompanyChange }: { company: CompanyDays; onCompanyChange: () => Promise<void> }) {
  const { tx } = useI18n();
  const { data, reload } = useApi<{ slots: Slot[]; meetings: Meeting[] }>("/api/meeting-slots");
  const openDays = useMemo(() => participationDays(company.participationDates), [company.participationDates]);
  const [editDays, setEditDays] = useState(false);
  const [form, setForm] = useState({ dates: openDays, from: "10:00", to: "17:00", minutes: 30, breakMinutes: 0, location: "" });
  const [shownDays, setShownDays] = useState(openDays);
  if (shownDays !== openDays) {
    setShownDays(openDays);
    setForm((f) => ({ ...f, dates: openDays }));
  }
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});

  useRealtime((t) => {
    if (t === "agenda" || t === "app") void reload();
  });

  const slots = data?.slots || [];
  const meetings = data?.meetings || [];
  const pending = meetings.filter((m) => m.status === "Bekliyor");
  const accepted = meetings.filter((m) => m.status === "Kabul");
  const slotDays = COP_DATES.filter((date) => slots.some((s) => s.date === date));
  const slotById = new Map(slots.map((s) => [s.id, s]));

  function toggleDay(date: string) {
    if (!openDays.includes(date)) return;
    setForm((f) => ({ ...f, dates: f.dates.includes(date) ? f.dates.filter((d) => d !== date) : [...f.dates, date].sort() }));
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    try {
      const res = await api<{ created: number; skipped: number }>("/api/meeting-slots", { method: "POST", body: JSON.stringify(form) });
      setInfo(
        res.skipped
          ? `${res.created} ${tx("saat eklendi")}, ${res.skipped} ${tx("saat mevcut saatlerle çakıştığı için atlandı.")}`
          : `${res.created} ${tx("saat eklendi.")}`
      );
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : tx("Kayıt alınamadı"));
    }
  }

  async function removeSlot(slot: Slot) {
    if (slot.state === "bekliyor" && !confirm(tx("Bu saatte bekleyen talep var. Saat kaldırılırsa talep reddedilir. Devam edilsin mi?"))) return;
    setError("");
    try {
      await api(`/api/meeting-slots/${slot.id}`, { method: "DELETE" });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : tx("İşlem yapılamadı"));
    }
  }

  async function clearDay(date: string) {
    if (!confirm(tx("Bu günün talep almamış tüm boş saatleri silinsin mi?"))) return;
    await api(`/api/meeting-slots?date=${date}`, { method: "DELETE" });
    await reload();
  }

  async function respond(m: Meeting, status: "Kabul" | "Red") {
    setError("");
    try {
      await api(`/api/company-meetings/${m.id}`, { method: "PATCH", body: JSON.stringify({ status, note: notes[m.id] || "" }) });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : tx("İşlem yapılamadı"));
    }
  }

  function when(m: Meeting) {
    const slot = m.slotId ? slotById.get(m.slotId) : undefined;
    if (m.status === "Kabul") return [m.whenDate, m.startTime && m.endTime ? `${m.startTime}–${m.endTime}` : m.startTime].filter(Boolean).join(" · ");
    if (slot) return `${dayLabel(slot.date)} · ${slot.startTime}–${slot.endTime}`;
    return [m.preferredDate, m.preferredTime].filter(Boolean).join(" · ") || tx("Saat belirtilmedi");
  }

  return (
    <section id="toplanti" className="card p-4 space-y-4 scroll-mt-20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="display text-2xl">{tx("Toplantı takvimi")}</h2>
          <p className="text-sm text-[#57534e]">
            {tx("Önce pavilyona katılacağınız günleri seçin, sonra bu günlerde toplantıya uygun saat aralığını açın. Ziyaretçi uygulamasından veya diğer hesaplardan toplantı isteyenler bu saatlerden birini seçer; siz onaylayınca saat dolar.")}
          </p>
        </div>
        <Link className="btn" href="/takvimim"><CalendarDays size={16} />{tx("Takvimimi gör")}</Link>
      </div>

      {!openDays.length || editDays ? (
        <ParticipationDays
          companyId={company.id}
          participationDates={company.participationDates}
          formDays={company.formHint?.days}
          onCancel={openDays.length ? () => setEditDays(false) : undefined}
          onSaved={async () => {
            await onCompanyChange();
            await reload();
            setEditDays(false);
          }}
        />
      ) : (
        <div className="flex flex-wrap items-center gap-2 text-sm border border-[#DCE8F0] p-2">
          <span>{tx("Katılım günleriniz")}: <b className="text-[#0077C2]">{formatParticipationDays(openDays)}</b></span>
          <span className="text-xs text-[#57534e]">{tx("Takviminiz yalnızca bu günlerde açık; diğer günler kapalı.")}</span>
          <button type="button" className="text-xs underline ml-auto" onClick={() => setEditDays(true)}>{tx("Günleri değiştir")}</button>
        </div>
      )}

      {info ? <p className="text-sm text-[#22A34A]">{info}</p> : null}
      {error ? <p className="text-sm text-[#E31C23]">{error}</p> : null}

      <form className={`border border-[#DCE8F0] p-3 space-y-3 ${openDays.length ? "" : "opacity-50 pointer-events-none"}`} onSubmit={create} aria-disabled={!openDays.length}>
        <div>
          <div className="text-sm font-semibold mb-1">{tx("Toplantı saati açılacak günler")}</div>
          <div className="flex flex-wrap gap-1.5">
            {COP_DATES.map((date) => {
              const open = openDays.includes(date);
              const on = open && form.dates.includes(date);
              return (
                <button
                  key={date}
                  type="button"
                  disabled={!open}
                  title={open ? undefined : tx("Katılım gününüz değil — takvim kapalı")}
                  className={`px-2 py-1 text-xs border ${
                    on ? "bg-[#00A3E0] border-[#00A3E0] text-white" : open ? "border-[#B5DFF2] bg-white" : "border-[#E5E7EB] bg-[#F3F4F6] text-[#9AA5AD] line-through cursor-not-allowed"
                  }`}
                  aria-pressed={on}
                  onClick={() => toggleDay(date)}
                >
                  {dayLabel(date)}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <label className="text-sm">{tx("Başlangıç")}
            <input className="field mt-1" type="time" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} />
          </label>
          <label className="text-sm">{tx("Bitiş")}
            <input className="field mt-1" type="time" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} />
          </label>
          <label className="text-sm">{tx("Görüşme süresi")}
            <select className="field mt-1" value={form.minutes} onChange={(e) => setForm({ ...form, minutes: Number(e.target.value) })}>
              {DURATIONS.map((d) => <option key={d} value={d}>{d} {tx("dk")}</option>)}
            </select>
          </label>
          <label className="text-sm">{tx("Ara")}
            <select className="field mt-1" value={form.breakMinutes} onChange={(e) => setForm({ ...form, breakMinutes: Number(e.target.value) })}>
              {[0, 5, 10, 15, 30].map((d) => <option key={d} value={d}>{d ? `${d} ${tx("dk")}` : tx("Yok")}</option>)}
            </select>
          </label>
          <label className="text-sm col-span-2 md:col-span-1">{tx("Yer")}
            <input className="field mt-1" placeholder={tx("Örn. Firma standı")} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </label>
        </div>
        <button className="btn" disabled={!form.dates.length}>{tx("Saatleri oluştur")}</button>
      </form>

      {pending.length ? (
        <div className="space-y-2">
          <h3 className="font-semibold">{tx("Onay bekleyen talepler")} ({pending.length})</h3>
          {pending.map((m) => (
            <div key={m.id} className="border border-[#F5A623] bg-[#FFF8EC] p-3 flex flex-wrap gap-3 items-start">
              <div className="flex-1 min-w-[220px] text-sm">
                <div className="font-semibold">{m.fromName}{m.fromOrganization ? ` · ${m.fromOrganization}` : ""}</div>
                <div className="text-[#0077C2] font-semibold">{when(m)}</div>
                <div>{m.topic}</div>
                {m.message ? <div className="text-[#57534e]">{m.message}</div> : null}
                <div className="text-xs text-[#57534e]">{[m.fromEmail, m.fromPhone].filter(Boolean).join(" · ")}</div>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <input className="field w-48" placeholder={tx("Not (isteğe bağlı)")} value={notes[m.id] || ""} onChange={(e) => setNotes({ ...notes, [m.id]: e.target.value })} />
                <button type="button" className="btn" onClick={() => void respond(m, "Kabul")}><Check size={14} />{tx("Onayla")}</button>
                <button type="button" className="btn ghost" onClick={() => void respond(m, "Red")}><X size={14} />{tx("Reddet")}</button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {slotDays.length ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-3 border border-[#B5DFF2] bg-white inline-block" />{tx("Boş")}</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-[#FFE7B8] inline-block" />{tx("Talep var")}</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-[#32C45A] inline-block" />{tx("Dolu")}</span>
          </div>
          {slotDays.map((date) => (
            <div key={date}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="text-sm font-semibold">
                  {dayLabel(date)}
                  {!openDays.includes(date) ? <span className="badge high ml-2">{tx("Kapalı gün · yalnızca talepli saatler")}</span> : null}
                </div>
                <button type="button" className="text-xs underline text-[#57534e]" onClick={() => void clearDay(date)}>{tx("Boş saatleri temizle")}</button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {slots.filter((s) => s.date === date).map((s) => (
                  <span
                    key={s.id}
                    className={`inline-flex items-center gap-1 px-2 py-1 text-xs tabular-nums border ${
                      s.state === "dolu" ? "bg-[#32C45A] border-[#32C45A] text-white" : s.state === "bekliyor" ? "bg-[#FFE7B8] border-[#F5A623]" : "bg-white border-[#B5DFF2]"
                    }`}
                    title={s.location}
                  >
                    {s.startTime}–{s.endTime}
                    {s.state === "bekliyor" ? <b>· {s.pending}</b> : null}
                    {s.state !== "dolu" ? (
                      <button type="button" aria-label={tx("Saati kaldır")} onClick={() => void removeSlot(s)}><Trash2 size={11} /></button>
                    ) : null}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[#57534e]">{tx("Henüz uygun saat eklemediniz.")}</p>
      )}

      {accepted.length ? (
        <div className="space-y-1">
          <h3 className="font-semibold">{tx("Onaylanan toplantılar")}</h3>
          {accepted.map((m) => (
            <div key={m.id} className="text-sm border-b border-[#DCE8F0] pb-1 flex flex-wrap justify-between gap-2">
              <span><b className="tabular-nums text-[#0077C2]">{when(m)}</b> · {m.fromName}{m.fromOrganization ? ` · ${m.fromOrganization}` : ""} — {m.topic}</span>
              <button type="button" className="text-xs underline text-[#E31C23]" onClick={() => confirm(tx("Toplantı iptal edilsin mi? Saat yeniden boşalır.")) && void respond(m, "Red")}>
                {tx("İptal et")}
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
