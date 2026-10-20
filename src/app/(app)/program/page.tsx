"use client";

import { QrImage, usePublicOrigin } from "@/components/QrImage";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, useApi, useRealtime } from "@/lib/client";
import Link from "next/link";
import { CalendarDays, Check, Plus } from "lucide-react";
import { CopDayGrid, PavilionHourBoard, PlanChip, ProgramFilterBar, type ProgramFilter, planMatchesFilter } from "@/components/CopDayGrid";
import type { PlanDay, PlanItem } from "@/lib/plan-types";
import { useI18n, Tx } from "@/components/I18nProvider";
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

function PavilionDay({
  day,
  filter,
  admin,
  onEdit,
  onClose,
}: {
  day: PlanDay | null;
  filter: ProgramFilter;
  admin?: boolean;
  onEdit?: (item: PlanItem) => void;
  onClose: () => void;
}) {
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
      {admin && items.length ? <p className="text-sm text-[#3E6A88]">{tx("Düzenlemek için etkinliğin üzerine basın.")}</p> : null}
      <ul className="space-y-2">
        {items.map((item) => {
          const on = joined.has(item.id);
          const body = (
            <>
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
            </>
          );
          return (
            <li key={item.id} className="border border-[#DCE8F0] p-3 flex flex-wrap gap-3 items-start">
              {admin ? (
                <button type="button" className="flex flex-1 gap-3 text-left min-w-0 hover:opacity-80" onClick={() => onEdit?.(item)}>
                  {body}
                </button>
              ) : (
                <div className="flex flex-1 gap-3 min-w-0">{body}</div>
              )}
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

export default function ProgramPage() {
  const { tx } = useI18n();
  const router = useRouter();
  const { data, reload } = useApi<Day[]>("/api/days");
  const { data: plan, reload: reloadPlan } = useApi<{ days: PlanDay[] }>("/api/plan");
  const { data: me } = useApi<{ role: string }>("/api/auth/me");
  const isAdmin = me?.role === "ADMIN";
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [boot, setBoot] = useState(false);
  const [editAgenda, setEditAgenda] = useState<string | null>(null);
  const [programFilter, setProgramFilter] = useState<ProgramFilter>("all");
  const [board, setBoard] = useState(true);
  const [copied, setCopied] = useState(false);
  const publicOrigin = usePublicOrigin();

  useEffect(() => {
    if (boot || !plan?.days?.length) return;
    const first = plan.days.find((d) => d.items.length) || plan.days[0];
    if (first) setSelectedDate(first.date);
    setBoot(true);
  }, [plan, boot]);

  useRealtime((t) => {
    if (t === "agenda" || t === "panel" || t === "inbox") {
      void reload();
      void reloadPlan();
    }
  });

  const themeDay = (data || []).find((d) => d.date === selectedDate);
  const planDay = (plan?.days || []).find((d) => d.date === selectedDate) || null;
  const subscribeUrl = useMemo(() => {
    if (typeof window === "undefined") return "/api/calendar";
    return `${window.location.origin}/api/calendar`;
  }, []);

  async function copySubscribe() {
    await navigator.clipboard.writeText(subscribeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function editItem(item: PlanItem) {
    if (item.id.startsWith("panel-")) {
      const id = item.id.slice("panel-".length);
      router.push(`${item.kind === "sunum" ? "/sunumlar" : "/paneller"}?open=${encodeURIComponent(id)}`);
      return;
    }
    if (item.id.startsWith("event-")) {
      router.push(`/etkinlikler?open=${encodeURIComponent(item.id.slice("event-".length))}`);
      return;
    }
    if (item.id.startsWith("agenda-")) setEditAgenda(item.id.slice("agenda-".length));
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between gap-3 flex-wrap">
        <div>
          <h1 className="display text-4xl">{tx("COP31 Sağlık Bakanlığı Pavilyon Gündemi")}</h1>
          <p className="text-[#57534e]">
            {tx("Bir güne basın, o günün programı aşağıda açılır.")}
            {isAdmin ? ` ${tx("Etkinliğin üzerine basınca düzenleme açılır.")}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={board ? "btn" : "btn ghost"} onClick={() => setBoard((on) => !on)}>
            {board ? tx("Gün kutuları") : tx("Büyük takvim")}
          </button>
          <a className="btn" href="/api/pdf/program">{tx("Program PDF")}</a>
          <a className="btn secondary" href="/api/calendar">{tx("ICS indir")}</a>
          <a className="btn ghost" href="/p" target="_blank"><Tx>Açık program</Tx></a>
          <button className="btn ghost" onClick={copySubscribe}>{copied ? tx("URL kopyalandı") : tx("Google’a abone URL")}</button>
        </div>
      </div>
      <ProgramFilterBar value={programFilter} onChange={setProgramFilter} />
      {board ? (
        <>
          <p className="text-sm text-[#3E6A88]">{tx("9.00–19.00 arası her saat. Yeşil kutu boştur; dolu kutuda oturumun adı yazar.")}</p>
          <PavilionHourBoard
            days={plan?.days || []}
            filter={programFilter}
            selected={selectedDate}
            onSelect={(date) => {
              setEditAgenda(null);
              setSelectedDate(date);
              requestAnimationFrame(() => document.getElementById("gun-gorunumu")?.scrollIntoView({ behavior: "smooth", block: "start" }));
            }}
          />
        </>
      ) : (
        <CopDayGrid
          days={plan?.days || []}
          filter={programFilter}
          selected={selectedDate}
          onSelect={(date) => {
            setEditAgenda(null);
            setSelectedDate(date);
            requestAnimationFrame(() => document.getElementById("gun-gorunumu")?.scrollIntoView({ behavior: "smooth", block: "start" }));
          }}
        />
      )}
      {planDay ? (
        <div id="gun-gorunumu" className="space-y-4">
          <PavilionDay
            day={planDay}
            filter={programFilter}
            admin={isAdmin}
            onEdit={editItem}
            onClose={() => {
              setEditAgenda(null);
              setSelectedDate(null);
            }}
          />
          {isAdmin && editAgenda && themeDay ? (
            <AgendaDayBoard
              date={themeDay.date}
              items={themeDay.agenda}
              canEdit
              focusId={editAgenda}
              editorOnly
              onChanged={async () => {
                await reload();
                await reloadPlan();
              }}
            />
          ) : null}
        </div>
      ) : null}
      <div className="card p-4 flex flex-wrap gap-6 items-center max-w-xl">
        <QrImage path="/p" alt="Program QR" size={140} />
        <div>
          <div className="text-xs tracking-[0.16em] uppercase text-[#0077C2]"><Tx>Dışarıya açık program QR</Tx></div>
          <p className="text-sm mt-1"><Tx>Ziyaretçi okutunca gündem ve etkinlik kayıtları açılır. Baskı için bu karekodu kullanın.</Tx></p>
          <a className="text-sm text-[#0077C2] underline" href="/p" target="_blank">{publicOrigin}/p</a>
        </div>
      </div>
      <p className="text-sm text-[#57534e]"><Tx>Google Calendar: Ayarlar → Diğer takvimler ekle → URL ile ekle →</Tx><code className="text-[#0077C2]">{subscribeUrl}</code><Tx>. Tek oturum için “Google’a ekle” kullanın.</Tx></p>
    </div>
  );
}
