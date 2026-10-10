"use client";

import { COP_DATES, COP_DAY_OPTIONS } from "@/lib/cop-days";
import { useI18n } from "@/components/I18nProvider";
import {
  SB_SEMINER,
  VENUES,
  adjustBooking,
  canonicalVenue,
  datesForVenue,
  timeLocked,
  venueHint,
} from "@/lib/venues";

export function VenueFields({
  location,
  date,
  startTime,
  endTime,
  showDate = true,
  onChange,
}: {
  location: string;
  date: string;
  startTime: string;
  endTime: string;
  showDate?: boolean;
  onChange: (next: { location: string; date: string; startTime: string; endTime: string }) => void;
}) {
  const { tx } = useI18n();
  const venue = canonicalVenue(location) || VENUES[2].label;
  const allowed = new Set(datesForVenue(venue, [...COP_DATES]));
  const locked = timeLocked(venue, date);
  function change(next: { location?: string; date?: string; startTime?: string; endTime?: string }) {
    const draft = {
      location: next.location ?? venue,
      date: next.date ?? date,
      startTime: next.startTime ?? startTime,
      endTime: next.endTime ?? endTime,
      dates: [...COP_DATES],
    };
    if (next.location != null || next.date != null) onChange(adjustBooking(draft));
    else onChange({ location: draft.location, date: draft.date, startTime: draft.startTime, endTime: draft.endTime });
  }

  return (
    <>
      <label className="text-sm">
        {tx("Yer")}
        <select className="field mt-1" value={venue} onChange={(e) => change({ location: e.target.value })}>
          {VENUES.map((item) => (
            <option key={item.id} value={item.label} disabled={showDate ? false : !datesForVenue(item.label, [date]).length}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      {showDate ? (
        <label className="text-sm">
          {tx("Tarih")}
          <select className="field mt-1" value={allowed.has(date) ? date : ""} onChange={(e) => change({ date: e.target.value })}>
            {COP_DAY_OPTIONS.map((day) => (
              <option key={day.date} value={day.date} disabled={!allowed.has(day.date)}>
                {day.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {locked ? (
        <p className="text-sm text-[#0077C2] self-end">{tx("Saat belli değil")}</p>
      ) : (
        <>
          <label className="text-sm">
            {tx("Başlangıç")}
            <input
              className="field mt-1"
              type="time"
              min={venue === SB_SEMINER ? "12:00" : undefined}
              max={venue === SB_SEMINER ? "22:00" : undefined}
              value={startTime}
              onChange={(e) => change({ startTime: e.target.value })}
            />
          </label>
          <label className="text-sm">
            {tx("Bitiş")}
            <input
              className="field mt-1"
              type="time"
              min={venue === SB_SEMINER ? "12:00" : undefined}
              max={venue === SB_SEMINER ? "22:00" : undefined}
              value={endTime}
              onChange={(e) => change({ endTime: e.target.value })}
            />
          </label>
        </>
      )}
      <p className="text-xs text-[#3E6A88] md:col-span-4">{tx(venueHint(venue))}</p>
    </>
  );
}
