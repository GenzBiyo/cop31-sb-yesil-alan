"use client";

import { PAVILION_STANDS, PAVILION_THEMES } from "@/lib/pavilion-program";
import { useI18n } from "@/components/I18nProvider";

const SLOTS = [
  { start: "09:00", end: "12:00" },
  { start: "12:00", end: "15:00" },
  { start: "15:00", end: "18:00" },
];

const STANDS = ["Stant 1", "Stant 2", "Stant 3", "Stant 4", "Stant 5", "Stant 6"];

function occupant(date: string, stand: string, start: string) {
  return PAVILION_STANDS.find((row) => row.date === date && row.stand === stand && row.start === start)?.name || "—";
}

export function StandCalendar() {
  const { tx } = useI18n();
  const dates = [...new Set(PAVILION_STANDS.map((row) => row.date))].sort();

  return (
    <div className="space-y-4">
      {dates.map((date) => {
        const theme = PAVILION_THEMES[date]?.tr || "";
        const label = new Date(`${date}T00:00:00`).toLocaleDateString("tr-TR", {
          weekday: "long",
          day: "numeric",
          month: "long",
        });
        return (
          <section key={date} className="card p-4">
            <p className="text-xs tracking-[0.16em] uppercase text-[#0077C2]">{label}</p>
            <h2 className="display text-2xl mt-1">{tx(theme)}</h2>
            <div className="mt-3 space-y-3 md:hidden">
              {STANDS.map((stand) => (
                <div key={stand} className="border border-[#DCE8F0] p-3">
                  <div className="font-semibold">{stand}</div>
                  {SLOTS.map((slot) => (
                    <div key={slot.start} className="mt-2 text-sm">
                      <span className="text-[#0077C2] tabular-nums">{slot.start}–{slot.end}</span>
                      <span className="ml-2">{occupant(date, stand, slot.start)}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-3 hidden md:block overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="text-left p-2 border-b border-[#DCE8F0]">Stant</th>
                    {SLOTS.map((slot) => (
                      <th key={slot.start} className="text-left p-2 border-b border-[#DCE8F0] whitespace-nowrap">
                        {slot.start}–{slot.end}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {STANDS.map((stand) => (
                    <tr key={stand}>
                      <td className="p-2 border-b border-[#DCE8F0] font-semibold whitespace-nowrap">{stand}</td>
                      {SLOTS.map((slot) => (
                        <td key={slot.start} className="p-2 border-b border-[#DCE8F0] align-top">
                          {occupant(date, stand, slot.start)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
