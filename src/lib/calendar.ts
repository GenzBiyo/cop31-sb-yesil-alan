const TZ = "Europe/Istanbul";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function compactLocal(date: string, time: string) {
  const [h = "00", m = "00"] = (time || "00:00").split(":");
  return `${date.replace(/-/g, "")}T${pad(Number(h))}${pad(Number(m))}00`;
}

function compactUtc(date: string, time: string) {
  const iso = new Date(`${date}T${time || "00:00"}:00+03:00`).toISOString();
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function icsEscape(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export type CalendarEvent = {
  id: string;
  title: string;
  description?: string;
  location?: string;
  date: string;
  startTime: string;
  endTime: string;
};

export function googleTemplateUrl(event: CalendarEvent) {
  const start = compactLocal(event.date, event.startTime);
  const end = compactLocal(event.date, event.endTime || event.startTime);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${start}/${end}`,
    details: event.description || "COP31 Sağlık Pavilionu — T.C. Sağlık Bakanlığı",
    location: event.location || "Antalya EXPO Center, Blue Zone",
    ctz: TZ,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function toIcsEvent(event: CalendarEvent) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return [
    "BEGIN:VEVENT",
    `UID:${event.id}@cop31.saglik.gov.tr`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${compactUtc(event.date, event.startTime)}`,
    `DTEND:${compactUtc(event.date, event.endTime || event.startTime)}`,
    `SUMMARY:${icsEscape(event.title)}`,
    `DESCRIPTION:${icsEscape(event.description || "COP31 Sağlık Pavilionu")}`,
    `LOCATION:${icsEscape(event.location || "Antalya EXPO Center, Blue Zone")}`,
    "END:VEVENT",
  ].join("\r\n");
}

export function wrapIcs(events: string[], name = "COP31 Sağlık Pavilionu") {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//T.C. Sağlık Bakanlığı//COP31 SB Pavilion//TR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${icsEscape(name)}`,
    `X-WR-TIMEZONE:${TZ}`,
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}

export function icsResponse(body: string, filename: string) {
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-cache",
    },
  });
}
