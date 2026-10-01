"use client";

import { QrImage, usePublicOrigin } from "@/components/QrImage";
import { useMemo, useState } from "react";
import { api, formatDay, useApi, useRealtime } from "@/lib/client";
import { googleTemplateUrl } from "@/lib/calendar";
import Link from "next/link";
import { CalendarDays, Check, Plus } from "lucide-react";
import { CopDayGrid, PlanChip, type ProgramFilter, agendaMatchesFilter, planMatchesFilter } from "@/components/CopDayGrid";
import type { PlanDay } from "@/lib/plan-types";
import { useI18n } from "@/components/I18nProvider";
import { AgendaDayBoard, type AgendaRow } from "@/components/AgendaDayBoard";

type Agenda = AgendaRow;
type Day = {
  id: string;
  date: string;
  themeTr: string;
  themeEn: string;
  topic1: string;
  topic2: string;
  notes: string;
  agenda: Agenda[];
};

function PavilionDay({ day, filter, onClose }: { day: PlanDay | null; filter: ProgramFilter; onClose: () => void }) {
  const { tx } = useI18n();
  const { data, reload } = useApi<{ keys: string[] }>("/api/calendar-joins");
  const joined = new Set(data?.keys || []);
  if (!day) return null;
  const items = day.items.filter((item) => planMatchesFilter(item.kind, filter));

  async function toggle(id: string) {
    if (joined.has(id)) await api(`/api/calendar-joins?itemKey=${encodeURIComponent(id)}`, { method: "DELETE" });
    else await api("/api/calendar-joins", { method: "POST", body: JSON.stringify({ itemKey: id }) });
    await reload();
  }

  return (
    <div className="card p-5 space-y-3">
      <div className="flex flex-wrap justify-between gap-2">
        <div>
          <p className="text-xs tracking-[0.18em] uppercase text-[#0077C2]">{day.weekday} · {day.day} {tx("Kasım")} 2026</p>
          <h2 className="display text-3xl mt-1">{tx(day.themeTr)}</h2>
        </div>
        <div className="flex gap-2 items-start">
          <Link className="btn secondary" href="/takvimim"><CalendarDays size={16} />{tx("Takvimimi gör")}</Link>
          <button className="btn ghost" onClick={onClose}>{tx("Kapat")}</button>
        </div>
      </div>
      {items.length === 0 ? <p className="text-sm text-[#57534e]">{tx("Bu günde henüz panel, sunum veya etkinlik yok.")}</p> : null}
      <ul className="space-y-2">
        {items.map((item) => {
          const on = joined.has(item.id);
          return (
            <li key={item.id} className="border border-[#DCE8F0] p-3 flex flex-wrap gap-3 items-start">
              <div className="text-sm tabular-nums w-24 shrink-0 text-[#0077C2] font-semibold">
                {item.startTime ? `${item.startTime}–${item.endTime}` : tx("Saat belli değil")}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-2 items-center">
                  <PlanChip kind={item.kind} />
                  <span className="font-semibold">{tx(item.title)}</span>
                </div>
                <p className="text-xs text-[#57534e] mt-1">{item.location}{item.people ? ` · ${item.people}` : ""}</p>
              </div>
              <button type="button" className={on ? "btn" : "btn ghost"} aria-pressed={on} onClick={() => void toggle(item.id)}>
                {on ? <Check size={14} /> : <Plus size={14} />}
                {on ? tx("Takvimimde") : tx("Katılmak istiyorum")}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function calendarEvent(day: Day, item: Agenda) {
  return {
    id: item.id,
    title: item.title,
    description: `${day.themeTr}\n${item.description || item.type}`,
    location: item.location,
    date: day.date,
    startTime: item.startTime,
    endTime: item.endTime,
  };
}

export default function ProgramPage() {
  const { tx } = useI18n();
  const { data, reload } = useApi<Day[]>("/api/days");
  const { data: plan, reload: reloadPlan } = useApi<{ days: PlanDay[] }>("/api/plan");
  const { data: me } = useApi<{ role: string }>("/api/auth/me");
  const canEdit = me?.role === "ADMIN" || me?.role === "SAGLIK";
  const [open, setOpen] = useState<string | null>(null);
  const [programFilter, setProgramFilter] = useState<ProgramFilter>("all");
  const [draft, setDraft] = useState<Partial<Day>>({});
  const [item, setItem] = useState({ startTime: "10:00", endTime: "11:00", title: "", type: "Panel", location: "Sağlık Pavilionu — Ana Sahne" });
  const [copied, setCopied] = useState(false);
  const publicOrigin = usePublicOrigin();

  useRealtime((t) => {
    if (t === "agenda" || t === "panel" || t === "inbox") {
      void reload();
      void reloadPlan();
    }
  });

  const day = (data || []).find((d) => d.id === open);
  const visibleAgenda = (day?.agenda || []).filter((row) => agendaMatchesFilter(row.type, programFilter));
  const subscribeUrl = useMemo(() => {
    if (typeof window === "undefined") return "/api/calendar";
    return `${window.location.origin}/api/calendar`;
  }, []);

  async function saveDay() {
    if (!day) return;
    await api("/api/days", { method: "PATCH", body: JSON.stringify({ ...day, ...draft, id: day.id }) });
    setDraft({});
    await reload();
    await reloadPlan();
  }

  async function copySubscribe() {
    await navigator.clipboard.writeText(subscribeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between gap-3 flex-wrap">
        <div>
          <h1 className="display text-4xl">{canEdit ? tx("COP31 gündemi") : tx("COP31 Sağlık Bakanlığı Pavilyon Gündemi")}</h1>
          <p className="text-[#57534e]">
            {canEdit
              ? tx("Onaylanan paneller, sunumlar ve etkinlikler burada. Saatleri kaydırın; QR ile kayıt ve otomatik haber.")
              : tx("Pavilyondaki tüm panel, konuşma ve etkinlikler. Bir güne basın, katılmak istediklerinizi takviminize ekleyin.")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a className="btn" href="/api/pdf/program">Program PDF</a>
          <a className="btn secondary" href="/api/calendar">ICS indir</a>
          <a className="btn ghost" href="/p" target="_blank">Açık program</a>
          <button className="btn ghost" onClick={copySubscribe}>{copied ? "URL kopyalandı" : "Google’a abone URL"}</button>
        </div>
      </div>
      <div className="card p-4 flex flex-wrap gap-6 items-center max-w-xl">
        <QrImage path="/p" alt="Program QR" size={140} />
        <div>
          <div className="text-xs tracking-[0.16em] uppercase text-[#0077C2]">Dışarıya açık program QR</div>
          <p className="text-sm mt-1">Ziyaretçi okutunca gündem ve etkinlik kayıtları açılır. Baskı için bu karekodu kullanın.</p>
          <a className="text-sm text-[#0077C2] underline" href="/p" target="_blank">{publicOrigin}/p</a>
        </div>
      </div>
      <p className="text-sm text-[#57534e]">
        Google Calendar: Ayarlar → Diğer takvimler ekle → URL ile ekle → <code className="text-[#0077C2]">{subscribeUrl}</code>
        . Tek oturum için “Google’a ekle” kullanın.
      </p>
      <CopDayGrid
        days={plan?.days || []}
        filter={programFilter}
        onFilterChange={setProgramFilter}
        selected={(data || []).find((d) => d.id === open)?.date}
        onSelect={(date) => {
          const found = (data || []).find((d) => d.date === date);
          if (!found) return;
          setOpen(found.id);
          setDraft(found);
        }}
      />
      {day && !canEdit ? (
        <PavilionDay
          day={(plan?.days || []).find((d) => d.date === day.date) || null}
          filter={programFilter}
          onClose={() => setOpen(null)}
        />
      ) : null}
      {day && canEdit ? (
        <div className="card p-5 space-y-4">
          <div className="flex justify-between">
            <h2 className="display text-3xl">{formatDay(day.date)}</h2>
            <button className="btn ghost" onClick={() => setOpen(null)}>Kapat</button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <label className="text-sm">Tema (TR)<input className="field mt-1" defaultValue={day.themeTr} onChange={(e) => setDraft((d) => ({ ...d, themeTr: e.target.value }))} /></label>
            <label className="text-sm">Tema (EN)<input className="field mt-1" defaultValue={day.themeEn} onChange={(e) => setDraft((d) => ({ ...d, themeEn: e.target.value }))} /></label>
            <label className="text-sm md:col-span-2">Konu 1<input className="field mt-1" defaultValue={day.topic1} onChange={(e) => setDraft((d) => ({ ...d, topic1: e.target.value }))} /></label>
            <label className="text-sm md:col-span-2">Konu 2<input className="field mt-1" defaultValue={day.topic2} onChange={(e) => setDraft((d) => ({ ...d, topic2: e.target.value }))} /></label>
            <label className="text-sm md:col-span-2">Notlar<textarea className="field mt-1" defaultValue={day.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} /></label>
          </div>
          <button className="btn" onClick={saveDay}>Gündemi kaydet</button>
          <h3 className="display text-2xl pt-2">{tx("Günün oturumları")}</h3>
          <AgendaDayBoard
            date={day.date}
            items={visibleAgenda}
            canEdit={!!canEdit}
            onChanged={async () => {
              await reload();
              await reloadPlan();
            }}
          />
          <ul className="space-y-2">
            {visibleAgenda.map((a) => (
              <li key={`cal-${a.id}`} className="text-xs text-[#57534e] flex gap-2">
                <a className="text-[#0077C2] underline" href={googleTemplateUrl(calendarEvent(day, a))} target="_blank" rel="noreferrer">Google · {a.title}</a>
                <a className="text-[#0077C2] underline" href={`/api/calendar?id=${a.id}`}>ICS</a>
                {canEdit ? (
                  <button
                    className="underline"
                    onClick={async () => {
                      await api(`/api/agenda/${a.id}`, { method: "DELETE" });
                      await reload();
                      await reloadPlan();
                    }}
                  >
                    Sil
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          {canEdit ? (
            <div className="grid md:grid-cols-6 gap-2 items-end">
              <input className="field" type="time" value={item.startTime} onChange={(e) => setItem({ ...item, startTime: e.target.value })} />
              <input className="field" type="time" value={item.endTime} onChange={(e) => setItem({ ...item, endTime: e.target.value })} />
              <input className="field md:col-span-2" placeholder="Oturum başlığı" value={item.title} onChange={(e) => setItem({ ...item, title: e.target.value })} />
              <select className="field" value={item.type} onChange={(e) => setItem({ ...item, type: e.target.value })}>
                <option>Panel</option>
                <option>Sunum</option>
                <option>Etkinlik</option>
                <option>Açılış</option>
                <option>Quick Talk</option>
                <option>Seminer</option>
              </select>
              <button
                className="btn"
                onClick={async () => {
                  if (!item.title) return;
                  await api("/api/agenda", { method: "POST", body: JSON.stringify({ dayId: day.id, ...item }) });
                  setItem({ ...item, title: "" });
                  await reload();
                  await reloadPlan();
                }}
              >
                Oturum ekle
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
