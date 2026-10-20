"use client";

import Link from "next/link";
import type { PlanDay, PlanItem, PlanKind } from "@/lib/plan-types";
import { PAVILION_CLOSED } from "@/lib/pavilion-program";
import { useI18n } from "@/components/I18nProvider";

const DAY_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

function clockMinutes(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function itemsAtHour(items: PlanItem[], hour: number) {
  const start = hour * 60;
  const end = start + 60;
  return items.filter((item) => {
    const from = clockMinutes(item.startTime);
    if (from == null) return false;
    const to = clockMinutes(item.endTime) ?? from + 60;
    return from < end && to > start;
  });
}

const KIND: Record<PlanKind, { label: string; color: string; bg: string }> = {
  panel: { label: "Panel", color: "#6E3A44", bg: "#F3E6E8" },
  sunum: { label: "Sunum", color: "#2C5278", bg: "#E6F0F8" },
  event: { label: "Dijital oyun", color: "#245C42", bg: "#E5F2EB" },
  program: { label: "Program", color: "#3E5568", bg: "#E8EEF2" },
};

export type ProgramFilter = "all" | "panel" | "sunum" | "event";

const FILTERS: { id: ProgramFilter; label: string }[] = [
  { id: "all", label: "Tümü Göster" },
  { id: "panel", label: "Paneller" },
  { id: "sunum", label: "Konuşmalar" },
  { id: "event", label: "Dijital oyunlar" },
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

export function PavilionHourBoard({
  days,
  selected,
  onSelect,
  filter = "all",
}: {
  days: PlanDay[];
  selected?: string | null;
  onSelect?: (date: string) => void;
  filter?: ProgramFilter;
}) {
  const { tx, tag } = useI18n();
  return (
    <div className="card p-3 overflow-x-auto">
      <table className="hour-board">
        <thead>
          <tr>
            <th>{tx("Saat")}</th>
            {days.map((day) => {
              const items = day.items.filter((item) => planMatchesFilter(item.kind, filter) && clockMinutes(item.startTime) != null);
              const free = PAVILION_CLOSED.includes(day.date) ? 0 : DAY_HOURS.filter((hour) => itemsAtHour(items, hour).length === 0).length;
              const on = selected === day.date;
              return (
                <th key={day.date} className={on ? "is-on" : ""}>
                  <button type="button" onClick={() => onSelect?.(day.date)}>
                    <span>{new Date(day.date + "T00:00:00").toLocaleDateString(tag, { weekday: "short" })}</span>
                    <strong>{day.day}</strong>
                    <em>{PAVILION_CLOSED.includes(day.date) ? tx("Kapalı") : `${free} ${tx("boş")}`}</em>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {DAY_HOURS.map((hour) => (
            <tr key={hour}>
              <th>{String(hour).padStart(2, "0")}:00</th>
              {days.map((day) => {
                const closed = PAVILION_CLOSED.includes(day.date);
                const items = closed ? [] : itemsAtHour(day.items.filter((item) => planMatchesFilter(item.kind, filter)), hour);
                return (
                  <td key={day.date} className={closed ? "is-closed" : items.length ? "is-busy" : "is-free"}>
                    {closed ? (hour === 13 ? tx("Yeşil Alan kapalı") : "") : items.length ? (
                      <button type="button" onClick={() => onSelect?.(day.date)}>
                        {items.map((item) => (
                          <span key={item.id} title={`${item.startTime}–${item.endTime} ${item.title}`}>
                            <PlanChip kind={item.kind} />
                            {tx(item.title)}
                          </span>
                        ))}
                      </button>
                    ) : (
                      <button type="button" onClick={() => onSelect?.(day.date)}>{tx("Boş")}</button>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
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
