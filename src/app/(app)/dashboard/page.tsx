"use client";

import Link from "next/link";
import { useApi, formatDate } from "@/lib/client";
import { useI18n } from "@/components/I18nProvider";

type Stats = {
  todos: { total: number; byStatus: Record<string, number>; avg: number; risk: number; upcoming: number };
  companies: { total: number; confirmed: number; pending: number };
  panels: number;
  pendingProposals?: { panels: number; events: number };
  announcements: number;
  openQa: number;
  days: { date: string; themeTr: string; agenda: { id: string }[] }[];
  recentTodos: { id: string; activity: string; dueDate: string; status: string; risk: string; remainingDays: number | null }[];
};

export default function DashboardPage() {
  const { tx, t } = useI18n();
  const { data, loading } = useApi<Stats>("/api/stats");
  if (loading || !data) return <p>{tx("Yükleniyor…")}</p>;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="display text-4xl">{tx("Hazırlık özeti")}</h1>
        <p className="text-[#57534e]">{tx("COP31 Sağlık Pavilionu (Yeşil Alan) · Antalya EXPO Center")}</p>
      </div>
      {(data.pendingProposals?.panels || 0) + (data.pendingProposals?.events || 0) > 0 ? (
        <div className="card p-4 flex flex-wrap justify-between gap-3 items-center" style={{ borderLeft: "4px solid #00A3E0" }}>
          <div>
            <div className="text-xs uppercase tracking-[0.14em] text-[#0077C2]">{tx("Firma önerileri")}</div>
            <p className="text-sm mt-1">
              {data.pendingProposals?.panels || 0} {tx("panel / sunum")} · {data.pendingProposals?.events || 0} {tx("etkinlik")} {tx("onay bekliyor")}
            </p>
          </div>
          <div className="flex gap-2">
            <Link className="btn" href="/paneller">{tx("Paneller")}</Link>
            <Link className="btn ghost" href="/etkinlikler">{tx("Etkinlikler")}</Link>
          </div>
        </div>
      ) : null}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          ["To-do tamamlanma", `%${data.todos.avg}`, "#00A3E0"],
          ["Riskli / yaklaşan", `${data.todos.risk} / ${data.todos.upcoming}`, "#E31C23"],
          ["Onaylı firma", `${data.companies.confirmed}/${data.companies.total}`, "#32C45A"],
          ["Açık soru-cevap", String(data.openQa), "#00A3E0"],
        ].map(([k, v, accent]) => (
          <div key={k} className="card p-4" style={{ borderLeft: `4px solid ${accent}` }}>
            <div className="text-xs uppercase tracking-[0.14em] text-[#3E6A88]">{tx(k)}</div>
            <div className="display text-3xl mt-1 text-[#0077C2]">{v}</div>
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-4">
        <div className="card p-4">
          <div className="flex justify-between items-baseline">
            <h2 className="display text-2xl">{tx("Tematik günler")}</h2>
            <Link href="/program" className="text-sm text-[#0077C2]">{tx("Gündemi düzenle")}</Link>
          </div>
          <div className="mt-3 grid sm:grid-cols-2 gap-2">
            {data.days.map((d) => (
              <div key={d.date} className="border-b border-[#DCE8F0] py-2">
                <div className="text-[#0077C2] text-sm font-semibold">{formatDate(d.date)}</div>
                <div>{tx(d.themeTr)}</div>
                <div className="text-xs text-[#57534e]">{t("common.sessions", { n: d.agenda.length })}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-4">
          <div className="flex justify-between">
            <h2 className="display text-2xl">{tx("Yaklaşan işler")}</h2>
            <Link href="/todos" className="text-sm text-[#0077C2]">{tx("To-do listesi")}</Link>
          </div>
          <ul className="mt-3 space-y-3">
            {data.recentTodos.map((t) => (
              <li key={t.id}>
                <div className="text-sm">{t.activity}</div>
                <div className="text-xs text-[#57534e]">
                  {formatDate(t.dueDate)} · {tx(t.status)}
                  {t.risk ? ` · ${tx(t.risk)}` : ""}
                </div>
              </li>
            ))}
            {data.recentTodos.length === 0 ? <li className="text-sm text-[#57534e]">{tx("Riskli faaliyet yok.")}</li> : null}
          </ul>
        </div>
      </div>
    </div>
  );
}
