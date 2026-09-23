"use client";

import { useMemo, useState } from "react";
import { formatDate, useApi, useRealtime } from "@/lib/client";
import { CopDayGrid, CopDayDetail } from "@/components/CopDayGrid";
import type { PlanDay } from "@/lib/plan-types";
import { useI18n } from "@/components/I18nProvider";

type Todo = {
  id: string;
  no: number;
  workPackage: string;
  activity: string;
  startDate: string;
  dueDate: string;
  status: string;
  progress: number;
  priority: string;
};

const START = new Date("2026-09-03");
const END = new Date("2026-12-12");

function offset(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return Math.max(0, (d.getTime() - START.getTime()) / 86400000);
}

export default function TakvimPage() {
  const { tx } = useI18n();
  const { data } = useApi<Todo[]>("/api/todos");
  const { data: plan, reload: reloadPlan } = useApi<{ days: PlanDay[] }>("/api/plan");
  const [day, setDay] = useState<string | null>("2026-11-09");
  const selected = (plan?.days || []).find((d) => d.date === day) || null;
  const span = (END.getTime() - START.getTime()) / 86400000;

  useRealtime((t) => {
    if (t === "panel" || t === "agenda") void reloadPlan();
  });
  const months = useMemo(() => {
    const list = [];
    const cursor = new Date(START);
    cursor.setDate(1);
    while (cursor <= END) {
      list.push(new Date(cursor));
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return list;
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="display text-4xl">{tx("Hazırlık takvimi")}</h1>
        <p className="text-[#57534e]">9–20 Kasım, 12 kutu. Her günde panel, sunum ve etkinlik planı. Altta hazırlık Gantt’ı durur.</p>
      </div>
      <CopDayGrid days={plan?.days || []} selected={day} onSelect={setDay} />
      <CopDayDetail day={selected} />
      <h2 className="display text-2xl pt-2">Hazırlık Gantt</h2>
      <div className="card p-3 overflow-auto">
        <div className="min-w-[980px]">
          <div className="relative h-8 mb-2 text-xs text-[#57534e]">
            {months.map((m) => (
              <span key={m.toISOString()} className="absolute" style={{ left: `${(offset(m.toISOString().slice(0, 10)) / span) * 100}%` }}>
                {m.toLocaleDateString("tr-TR", { month: "short" })}
              </span>
            ))}
            <span className="absolute text-[#0077C2] font-semibold" style={{ left: `${(offset("2026-11-09") / span) * 100}%` }}>
              COP31
            </span>
          </div>
          <div className="relative h-3 mb-4 bg-[#efe6d8]">
            <div className="absolute top-0 bottom-0 bg-[#0077C2]/30" style={{ left: `${(offset("2026-11-09") / span) * 100}%`, width: `${(11 / span) * 100}%` }} />
          </div>
          {(data || []).map((t) => {
            const left = (offset(t.startDate || t.dueDate) / span) * 100;
            const days = Math.max(1, offset(t.dueDate || t.startDate) - offset(t.startDate || t.dueDate) + 1);
            const width = (days / span) * 100;
            const color = t.status === "Tamamlandı" ? "#22A34A" : t.status === "Devam Ediyor" ? "#00A3E0" : "#0077C2";
            return (
              <div key={t.id} className="grid grid-cols-[220px_1fr] gap-2 items-center mb-1">
                <div className="text-xs truncate" title={t.activity}>{t.no}. {t.activity}</div>
                <div className="relative h-5 bg-[#EAF2F8]">
                  <div className="absolute h-5 text-[10px] text-white px-1 overflow-hidden" style={{ left: `${left}%`, width: `${Math.max(width, 1.2)}%`, background: color }}>
                    {formatDate(t.dueDate)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
