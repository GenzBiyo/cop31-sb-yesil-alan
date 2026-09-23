"use client";

import { QrImage, usePublicOrigin } from "@/components/QrImage";
import { useMemo, useState } from "react";
import { api, formatDay, useApi, useRealtime } from "@/lib/client";
import { googleTemplateUrl } from "@/lib/calendar";
import { CopDayGrid } from "@/components/CopDayGrid";
import type { PlanDay } from "@/lib/plan-types";
import { useI18n } from "@/components/I18nProvider";

type Agenda = {
  id: string;
  startTime: string;
  endTime: string;
  title: string;
  description: string;
  location: string;
  type: string;
  status: string;
};
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
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Day>>({});
  const [item, setItem] = useState({ startTime: "10:00", endTime: "11:00", title: "", type: "Panel", location: "Sağlık Pavilionu — Ana Sahne" });
  const [copied, setCopied] = useState(false);
  const publicOrigin = usePublicOrigin();

  useRealtime((t) => {
    if (t === "agenda" || t === "panel") {
      void reload();
      void reloadPlan();
    }
  });

  const day = (data || []).find((d) => d.id === open);
  const subscribeUrl = useMemo(() => {
    if (typeof window === "undefined") return "/api/calendar";
    return `${window.location.origin}/api/calendar`;
  }, []);

  async function saveDay() {
    if (!day) return;
    await api("/api/days", { method: "PATCH", body: JSON.stringify({ id: day.id, ...day, ...draft }) });
    setDraft({});
    await reload();
    await reloadPlan();

  async function copySubscribe() {
    await navigator.clipboard.writeText(subscribeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between gap-3 flex-wrap">
        <div>
          <h1 className="display text-4xl">{tx("COP31 gündemi")}</h1>
          <p className="text-[#57534e]">12 gün, kutu kutu. Panel, sunum ve etkinlik aynı takvimde. Google Calendar ile eşlenebilir.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a className="btn" href="/api/pdf/program">Program PDF</a>
          <a className="btn secondary" href="/api/calendar">ICS indir</a>
          <a className="btn ghost" href="/p" target="_blank">Açık program</a>
          <button className="btn ghost" onClick={copySubscribe}>{copied ? "URL kopyalandı" : "Google’a abone URL"}</button>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <div className="card p-4 flex flex-wrap gap-6 items-center">
          <QrImage path="/p" alt="Program QR" size={140} />
          <div>
            <div className="text-xs tracking-[0.16em] uppercase text-[#0077C2]">Dışarıya açık program QR</div>
            <p className="text-sm mt-1">Ziyaretçi okutunca gündem ve etkinlik kayıtları açılır. Baskı için bu karekodu kullanın.</p>
            <a className="text-sm text-[#0077C2] underline" href="/p" target="_blank">{publicOrigin}/p</a>
          </div>
        </div>
        <div className="card p-4 flex flex-wrap gap-6 items-center">
          <QrImage path="/solaklar" alt="Solaklar QR" size={140} />
          <div>
            <div className="text-xs tracking-[0.16em] uppercase text-[#22A34A]">Solaklar outdoor QR</div>
            <p className="text-sm mt-1">11–12 Kasım sıfır atık köyü açık hava programı. Köy girişine ve elçi yaka kartına basılır.</p>
            <a className="text-sm text-[#22A34A] underline" href="/solaklar" target="_blank">{publicOrigin}/solaklar</a>
          </div>
        </div>
      </div>
      <p className="text-sm text-[#57534e]">
        Google Calendar: Ayarlar → Diğer takvimler ekle → URL ile ekle → <code className="text-[#0077C2]">{subscribeUrl}</code>
        . Tek oturum için “Google’a ekle” kullanın.
      </p>
      <CopDayGrid
        days={plan?.days || []}
        selected={(data || []).find((d) => d.id === open)?.date}
        onSelect={(date) => {
          const found = (data || []).find((d) => d.date === date);
          if (!found) return;
          setOpen(found.id);
          setDraft(found);
        }}
      />
      {day ? (
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
          <h3 className="display text-2xl pt-2">Oturumlar</h3>
          <ul className="space-y-2">
            {day.agenda.map((a) => (
              <li key={a.id} className="border border-[#DCE8F0] p-3 flex justify-between gap-3">
                <div>
                  <div className="text-xs text-[#0077C2]">{a.startTime}–{a.endTime} · {a.type}</div>
                  <div>{a.title}</div>
                  <div className="text-xs text-[#57534e]">{a.location}</div>
                  <div className="flex gap-2 mt-2">
                    <a className="btn ghost" href={googleTemplateUrl(calendarEvent(day, a))} target="_blank" rel="noreferrer">Google’a ekle</a>
                    <a className="btn ghost" href={`/api/calendar?id=${a.id}`}>ICS</a>
                  </div>
                </div>
                <button className="btn ghost" onClick={async () => { await api(`/api/agenda/${a.id}`, { method: "DELETE" }); await reload(); await reloadPlan(); }}>Sil</button>
              </li>
            ))}
          </ul>
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
        </div>
      ) : null}
    </div>
  );
}
