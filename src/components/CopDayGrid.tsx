"use client";

import Link from "next/link";
import type { PlanDay, PlanItem, PlanKind } from "@/lib/plan-types";
import { useI18n } from "@/components/I18nProvider";

const KIND: Record<PlanKind, { label: string; color: string; bg: string }> = {
  panel: { label: "Panel", color: "#FFFFFF", bg: "#E31C23" },
  sunum: { label: "Sunum", color: "#FFFFFF", bg: "#00A3E0" },
  event: { label: "Etkinlik", color: "#FFFFFF", bg: "#32C45A" },
  program: { label: "Program", color: "#FFFFFF", bg: "#0077C2" },
};

export type ProgramFilter = "all" | "panel" | "sunum" | "event";

const FILTERS: { id: ProgramFilter; label: string }[] = [
  { id: "all", label: "Tümü Göster" },
  { id: "panel", label: "Paneller" },
  { id: "sunum", label: "Konuşmalar" },
  { id: "event", label: "Etkinlikler" },
];

export function planMatchesFilter(kind: PlanKind, filter: ProgramFilter) {
  return filter === "all" || kind === filter;
}

export function agendaMatchesFilter(type: string, filter: ProgramFilter) {
  if (!/panel|sunum|seminer|quick talk|konuşma|etkinlik|deneyim|oyun/i.test(type)) return false;
  if (filter === "all") return true;
  if (filter === "panel") return /panel/i.test(type);
  if (filter === "sunum") return /sunum|seminer|quick talk|konuşma/i.test(type);
  return /etkinlik|deneyim|oyun/i.test(type);
}

export function ProgramFilterBar({
  value,
  onChange,
}: {
  value: ProgramFilter;
  onChange: (value: ProgramFilter) => void;
}) {
  const { tx } = useI18n();
  return (
    <div className="program-filter" role="tablist" aria-label={tx("Tümü Göster")}>
      {FILTERS.map((item) => {
        const on = value === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={on}
            className={`program-filter-btn ${on ? "is-on" : ""}`}
            data-kind={item.id}
            onClick={() => onChange(item.id)}
          >
            {tx(item.label)}
          </button>
        );
      })}
    </div>
  );
}

export function PlanChip({ kind }: { kind: PlanKind }) {
  const { tx } = useI18n();
  const k = KIND[kind] || KIND.program;
  return (
    <span className="text-[10px] tracking-[0.12em] uppercase px-1.5 py-0.5 font-semibold" style={{ color: k.color, background: k.bg }}>
      {tx(k.label)}
    </span>
  );
}

export function CopDayGrid({
  days,
  selected,
  onSelect,
  filter = "all",
  onFilterChange,
}: {
  days: PlanDay[];
  selected?: string | null;
  onSelect?: (date: string) => void;
  filter?: ProgramFilter;
  onFilterChange?: (filter: ProgramFilter) => void;
}) {
  const { tx, t, tag } = useI18n();
  const limit = filter === "all" ? 4 : 8;
  return (
    <div className="space-y-3">
      {onFilterChange ? <ProgramFilterBar value={filter} onChange={onFilterChange} /> : null}
      <div className="cop-day-grid">
        {days.map((d) => {
          const items = d.items.filter((item) => planMatchesFilter(item.kind, filter));
          const counts = {
            panel: items.filter((i) => i.kind === "panel").length,
            sunum: items.filter((i) => i.kind === "sunum").length,
            event: items.filter((i) => i.kind === "event").length,
          };
          const on = selected === d.date;
          return (
            <button
              key={d.date}
              type="button"
              onClick={() => onSelect?.(d.date)}
              className={`cop-day-box ${on ? "is-on" : ""}`}
            >
              <div className="flex justify-between items-baseline gap-2">
                <div>
                  <div className="text-[10px] tracking-[0.16em] uppercase text-[#00A3E0] font-bold">
                    {new Date(d.date + "T00:00:00").toLocaleDateString(tag, { weekday: "short" })}
                  </div>
                  <div className="display text-3xl leading-none text-[#0077C2]">{d.day} <span className="text-lg">{tx("Kas")}</span></div>
                </div>
                <div className="text-right text-[10px] text-[#0077C2] leading-tight font-semibold">
                  {filter !== "sunum" && filter !== "event" && counts.panel ? <div>{counts.panel} {tx("panel")}</div> : null}
                  {filter !== "panel" && filter !== "event" && counts.sunum ? <div>{counts.sunum} {tx("sunum")}</div> : null}
                  {filter !== "panel" && filter !== "sunum" && counts.event ? <div>{counts.event} {tx("etkinlik")}</div> : null}
                  {!items.length ? <div>{tx(filter === "all" ? "Boş gün" : "Bu filtrede kayıt yok.")}</div> : null}
                </div>
              </div>
              <p className="text-xs mt-2 min-h-[2.4em] text-[#0B1C33] font-semibold">{tx(d.themeTr)}</p>
              <div className="mt-2 space-y-1">
                {items.slice(0, limit).map((item) => (
                  <div key={item.id} className="cop-day-slot">
                    <span className="tabular-nums text-[#0077C2] font-bold">{item.startTime || "—"}</span>
                    <PlanChip kind={item.kind} />
                    <span className="truncate text-[#0B1C33]">{tx(item.title)}</span>
                  </div>
                ))}
                {items.length > limit ? (
                  <div className="text-[10px] text-[#57534e]">{t("common.moreItems", { n: items.length - limit })}</div>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CopDayDetail({ day, filter = "all" }: { day: PlanDay | null; filter?: ProgramFilter }) {
  const { tx } = useI18n();
  if (!day) return null;
  const items = day.items.filter((item) => planMatchesFilter(item.kind, filter));
  return (
    <div className="card p-5 space-y-3">
      <div>
        <p className="text-xs tracking-[0.18em] uppercase text-[#0077C2]">{day.weekday} · {day.day} Kasım 2026</p>
        <h2 className="display text-3xl mt-1">{tx(day.themeTr)}</h2>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-[#57534e]">
          {tx(filter === "all" ? "Bu günde henüz panel, sunum veya etkinlik yok." : "Bu günde bu filtreye uyan oturum yok.")}
        </p>
      ) : null}
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="border border-[#DCE8F0] p-3 flex gap-3 items-start">
            <div className="text-sm tabular-nums w-24 shrink-0 text-[#0077C2] font-semibold">
              {item.startTime}–{item.endTime}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-2 items-center">
                <PlanChip kind={item.kind} />
                {item.href ? (
                  <Link href={item.href} className="font-semibold hover:underline">{item.title}</Link>
                ) : (
                  <span className="font-semibold">{item.title}</span>
                )}
              </div>
              <p className="text-xs text-[#57534e] mt-1">
                {item.location}
                {item.people ? ` · ${item.people}` : ""}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function planItemTime(item: PlanItem) {
  return `${item.startTime}–${item.endTime}`;
}
