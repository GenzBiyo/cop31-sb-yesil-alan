import type ExcelJS from "exceljs";
import { prisma } from "./prisma";
import { THEME_TR } from "./constants";
import { memoClearPrefix } from "./memo";

export type AgendaSession = {
  date: string;
  start: string;
  end: string;
  title: string;
  moderator: string;
  speakers: string[];
  location: string;
  theme: string;
  closed: boolean;
};

const DATES = Object.keys(THEME_TR).sort();

function cellText(row: ExcelJS.Row, index: number) {
  const value = row.getCell(index).value;
  if (value == null) return "";
  if (typeof value === "object" && value && "text" in value) return String((value as { text: string }).text).trim();
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object" && value && "richText" in value) {
    const parts = (value as { richText: { text: string }[] }).richText;
    return parts.map((part) => part.text).join("").trim();
  }
  return String(value).replace(/\s+/g, " ").trim();
}

function clock(hour: string, minute: string) {
  return `${hour.padStart(2, "0")}:${minute}`;
}

function timeRange(label: string) {
  const match = label.match(/(\d{1,2})[:.](\d{2})\s*[-–]\s*(\d{1,2})[:.](\d{2})/);
  if (!match) return null;
  return { start: clock(match[1], match[2]), end: clock(match[3], match[4]) };
}

function dayFromHeader(label: string) {
  const match = label.match(/(\d{1,2})\s*Kasım/i);
  if (!match) return "";
  const date = `2026-11-${match[1].padStart(2, "0")}`;
  return DATES.includes(date) ? date : "";
}

function tidyName(value: string) {
  return value
    .replace(/\s*\[[^\]]*\]\s*/g, " ")
    .replace(/\s+oturum\b.*$/i, "")
    .replace(/\s+dsö mavi alan.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseSession(raw: string) {
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text || /^x$/i.test(text) || text === "#VALUE!") return null;
  if (/yeşil alan kapalı/i.test(text) && text.length < 48) {
    return { title: "Yeşil Alan kapalı", moderator: "", speakers: [] as string[], closed: true, location: "Yeşil Alan" };
  }
  const moderatorAt = text.search(/moderat[oö]r\s*:/i);
  const speakerAt = text.search(/konuşmacı/i);
  const cuts = [moderatorAt, speakerAt].filter((index) => index >= 0).sort((a, b) => a - b);
  const cut = cuts.length && cuts[0] > 8 ? cuts[0] : -1;
  const title = (cut > 0 ? text.slice(0, cut) : text).replace(/\s+/g, " ").replace(/[·|]+$/g, "").trim();
  const rest = cut > 0 ? text.slice(cut) : "";
  if (title.length < 3) return null;
  const moderator = tidyName((rest.match(/moderat[oö]r\s*:\s*(.+?)(?=konuşmacı|$)/i)?.[1] || "")).replace(/^\?+$/, "");
  const speakers: string[] = [];
  const speaker = /konuşmacı\s*\d*\s*:\s*(.+?)(?=konuşmacı\s*\d*\s*:|$)/gi;
  let found: RegExpExecArray | null;
  while ((found = speaker.exec(rest))) {
    const name = tidyName(found[1]);
    if (name && !/^\?+$/.test(name)) speakers.push(name.slice(0, 180));
  }
  const location = /mavi alan/i.test(text) ? "Mavi Alan" : "Sağlık Pavilionu — Ana Sahne";
  return { title: title.replace(/\s*\[[^\]]*\]\s*/g, " ").replace(/\s+/g, " ").trim().slice(0, 240), moderator: moderator.slice(0, 180), speakers, closed: false, location };
}

export function parseAgendaWorkbook(wb: ExcelJS.Workbook): AgendaSession[] {
  const ws =
    wb.worksheets.find((sheet) => /bir bakışta takvim1/i.test(sheet.name)) ||
    wb.worksheets.find((sheet) => /bir bakışta takvim/i.test(sheet.name));
  if (!ws) throw new Error("Bir Bakışta Takvim sayfası bulunamadı");

  let header = 0;
  const columns = new Map<number, string>();
  ws.eachRow((row, rowNumber) => {
    if (header || rowNumber > 40) return;
    if (!/^saat\b/i.test(cellText(row, 1))) return;
    for (let index = 2; index <= 20; index += 1) {
      const date = dayFromHeader(cellText(row, index));
      if (date) columns.set(index, date);
    }
    if (columns.size >= 8) header = rowNumber;
  });
  if (!header) throw new Error("Takvim günleri okunamadı");

  const themes = new Map<string, string>();
  const sessions: AgendaSession[] = [];
  const seen = new Set<string>();
  ws.eachRow((row, rowNumber) => {
    if (rowNumber <= header) return;
    const label = cellText(row, 1);
    if (/^stant\b/i.test(label)) return;
    if (/tematik/i.test(label)) {
      for (const [index, date] of columns) {
        const theme = cellText(row, index);
        const known = THEME_TR[date];
        themes.set(date, known && theme.toLocaleLowerCase("tr-TR").includes(known.toLocaleLowerCase("tr-TR").slice(0, 12)) ? known : known || theme);
      }
      return;
    }
    const range = timeRange(label);
    if (!range) return;
    for (const [index, date] of columns) {
      const parsed = parseSession(cellText(row, index));
      if (!parsed) continue;
      const key = `${date}|${range.start}|${parsed.title.toLocaleLowerCase("tr-TR")}`;
      if (seen.has(key)) continue;
      seen.add(key);
      sessions.push({
        date,
        start: range.start,
        end: range.end,
        title: parsed.title,
        moderator: parsed.moderator,
        speakers: parsed.speakers,
        location: parsed.location,
        theme: themes.get(date) || THEME_TR[date] || "",
        closed: parsed.closed,
      });
    }
  });
  if (sessions.length < 8) throw new Error("Takvimde yeterince oturum yok");
  return sessions;
}

async function personId(name: string, kind: string) {
  const clean = name.replace(/\s+/g, " ").trim();
  const found = await prisma.person.findFirst({ where: { name: clean } });
  if (found) return found.id;
  const created = await prisma.person.create({ data: { name: clean, organization: "", kind } });
  return created.id;
}

/** Replaces the official pavilion calendar with the sheet. Firm accounts, forms and messages stay. */
export async function applyAgendaSessions(sessions: AgendaSession[]) {
  for (const date of DATES) {
    const theme = THEME_TR[date] || sessions.find((session) => session.date === date)?.theme || date;
    await prisma.thematicDay.upsert({
      where: { date },
      create: { date, themeTr: theme, themeEn: "" },
      update: { themeTr: theme },
    });
  }

  const official = await prisma.panel.findMany({
    where: { companyId: "", OR: [{ notes: { startsWith: "pav:" } }, { notes: { startsWith: "sheet:" } }] },
    select: { id: true },
  });
  const ids = official.map((panel) => panel.id);
  await prisma.agendaItem.deleteMany({
    where: {
      OR: [
        { slotKey: { startsWith: "pav:" } },
        { slotKey: { startsWith: "sheet:" } },
        ...(ids.length ? [{ panelId: { in: ids } }] : []),
      ],
    },
  });
  if (ids.length) await prisma.panel.deleteMany({ where: { id: { in: ids } } });

  const days = await prisma.thematicDay.findMany({ select: { id: true, date: true } });
  const dayId = new Map(days.map((day) => [day.date, day.id]));

  for (const [index, session] of sessions.entries()) {
    const owner = dayId.get(session.date);
    if (!owner) continue;
    const note = `sheet:${session.date}:${session.start}:${index}`;
    const people = [
      session.moderator ? `Moderatör: ${session.moderator}` : "",
      session.speakers.length ? `Konuşmacılar: ${session.speakers.join(", ")}` : "",
    ].filter(Boolean);
    const panel = await prisma.panel.create({
      data: {
        title: session.title,
        kind: "panel",
        date: session.date,
        startTime: session.start,
        endTime: session.end,
        theme: session.theme,
        location: session.location,
        partners: [session.moderator, ...session.speakers].filter(Boolean).join(", "),
        summary: people.join("\n"),
        status: "Planlama",
        notes: note,
        companyId: "",
      },
    });
    if (!session.closed && session.moderator) {
      await prisma.panelPerson.create({
        data: { panelId: panel.id, personId: await personId(session.moderator, "moderator"), role: "moderator" },
      });
    }
    if (!session.closed) {
      for (const name of session.speakers) {
        await prisma.panelPerson.create({
          data: { panelId: panel.id, personId: await personId(name, "speaker"), role: "panelist" },
        });
      }
    }
    await prisma.agendaItem.create({
      data: {
        dayId: owner,
        startTime: session.start,
        endTime: session.end,
        title: session.title,
        description: people.join("\n"),
        type: session.closed ? "Duyuru" : "Panel",
        panelId: panel.id,
        location: session.location,
        status: "Planlandı",
        sortOrder: index,
        slotKey: note,
      },
    });
  }

  memoClearPrefix("day-plan");
  memoClearPrefix("public-program");
  return { sessions: sessions.length };
}
