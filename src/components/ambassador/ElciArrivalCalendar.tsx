"use client";

import { useMemo, useState } from "react";

export type ArrivalApplication = {
  id: string;
  fullName: string;
  school: string;
  city: string;
  status: string;
  availableDates: string;
};

const WEEKDAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const COP_START = 9;
const COP_END = 20;
const ACCEPTED = new Set(["Kabul edildi", "Yerleştirildi"]);

function novemberCells() {
  const lead = (new Date(2026, 10, 1).getDay() + 6) % 7;
  const cells: (number | null)[] = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= 30; day += 1) cells.push(day);
  while (cells.length % 7) cells.push(null);
  return cells;
}

function markedDays(raw: string) {
  const found = new Set<number>();
  for (const match of raw.matchAll(/(\d{1,2})\s*\.?\s*kasım/gi)) {
    const day = Number(match[1]);
    if (day >= COP_START && day <= COP_END) found.add(day);
  }
  for (const match of raw.matchAll(/2026-11-(\d{2})/g)) {
    const day = Number(match[1]);
    if (day >= COP_START && day <= COP_END) found.add(day);
  }
  return found;
}

export function ElciArrivalCalendar({
  applications,
  onOpen,
}: {
  applications: ArrivalApplication[];
  onOpen?: (id: string) => void;
}) {
  const [scope, setScope] = useState<"kabul" | "tumu">("kabul");
  const [selected, setSelected] = useState(9);
  const cells = useMemo(novemberCells, []);

  const people = useMemo(
    () => applications.filter((app) => (scope === "kabul" ? ACCEPTED.has(app.status) : app.status !== "Reddedildi")),
    [applications, scope],
  );

  const byDay = useMemo(() => {
    const map = new Map<number, ArrivalApplication[]>();
    for (let day = COP_START; day <= COP_END; day += 1) map.set(day, []);
    for (const app of people) {
      for (const day of markedDays(app.availableDates)) map.get(day)?.push(app);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.fullName.localeCompare(b.fullName, "tr"));
    }
    return map;
  }, [people]);

  const unmarked = people.filter((app) => markedDays(app.availableDates).size === 0);
  const dayPeople = byDay.get(selected) || [];
  const busiest = Array.from(byDay.entries()).reduce(
    (best, entry) => (entry[1].length > best[1].length ? entry : best),
    [COP_START, [] as ArrivalApplication[]] as [number, ArrivalApplication[]],
  );
  const peak = Math.max(1, ...Array.from(byDay.values(), (list) => list.length));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="display text-2xl">Kasım 2026</h2>
          <p className="text-sm text-[#57534e]">
            {scope === "kabul" ? "Kabul edilen elçilerin işaretlediği günler." : "Reddedilenler hariç bütün başvuruların işaretlediği günler."}
            {busiest[1].length > 0 ? ` En kalabalık gün ${busiest[0]} Kasım, ${busiest[1].length} kişi.` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <button className={scope === "kabul" ? "btn" : "btn ghost"} type="button" onClick={() => setScope("kabul")}>Kabul edilenler</button>
          <button className={scope === "tumu" ? "btn" : "btn ghost"} type="button" onClick={() => setScope("tumu")}>Tüm başvurular</button>
        </div>
      </div>

      <div className="card p-3 overflow-x-auto">
        <div className="grid grid-cols-7 gap-1 min-w-[640px]">
          {WEEKDAYS.map((label) => (
            <div key={label} className="px-2 py-1 text-xs uppercase tracking-wide text-[#3E6A88]">{label}</div>
          ))}
          {cells.map((day, index) => {
            if (!day) return <div key={`empty-${index}`} className="min-h-24 bg-[#F7FBFE]" />;
            const inCop = day >= COP_START && day <= COP_END;
            const list = inCop ? byDay.get(day) || [] : [];
            const active = selected === day && inCop;
            const heat = list.length / peak;
            return (
              <button
                key={day}
                type="button"
                disabled={!inCop}
                onClick={() => setSelected(day)}
                className={`min-h-24 p-2 text-left border ${active ? "border-[#0077C2] ring-2 ring-[#0077C2]" : "border-[#DCE8F0]"} ${inCop ? "" : "opacity-40"}`}
                style={{ background: inCop && list.length ? `rgba(0, 119, 194, ${0.08 + heat * 0.34})` : "#fff" }}
              >
                <div className="flex items-baseline justify-between gap-1">
                  <span className="font-semibold text-[#0B1C33]">{day}</span>
                  {inCop ? <span className="text-xs text-[#0077C2]">{list.length}</span> : null}
                </div>
                {inCop ? (
                  <ul className="mt-1 space-y-0.5">
                    {list.slice(0, 3).map((app) => (
                      <li key={app.id} className="text-[11px] leading-tight text-[#0B1C33] truncate">{app.fullName}</li>
                    ))}
                    {list.length > 3 ? <li className="text-[11px] text-[#0077C2]">+{list.length - 3}</li> : null}
                  </ul>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <section className="card p-4">
        <h3 className="display text-xl">{selected} Kasım · {dayPeople.length} elçi</h3>
        {dayPeople.length === 0 ? <p className="mt-2 text-sm text-[#57534e]">Bu gün için işaretleyen yok.</p> : null}
        <ul className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {dayPeople.map((app) => (
            <li key={app.id}>
              <button
                type="button"
                className="w-full text-left border border-[#DCE8F0] p-2 hover:border-[#0077C2]"
                onClick={() => onOpen?.(app.id)}
              >
                <div className="font-medium text-[#0B1C33]">{app.fullName}</div>
                <div className="text-xs text-[#57534e]">{app.school}{app.city ? ` · ${app.city}` : ""}</div>
                <span className={`badge mt-1 ${ACCEPTED.has(app.status) ? "ok" : "warn"}`}>{app.status}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {unmarked.length > 0 ? (
        <p className="text-sm text-[#57534e]">
          Gün işaretlememiş {unmarked.length} kişi: {unmarked.map((app) => app.fullName).join(", ")}
        </p>
      ) : null}
    </div>
  );
}
