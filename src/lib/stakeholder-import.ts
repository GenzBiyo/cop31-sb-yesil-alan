import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { FORM_DAYS, INTERACTIVE_OPTIONS, type NamedPerson } from "@/lib/stakeholder-form";

const COLUMNS: [string, string][] = [
  ["timestamp", "submittedAt"],
  ["email", "email"],
  ["firma ad", "companyName"],
  ["ana tema", "theme"],
  ["kaç kişi", "headcount"],
  ["kaç gün", "days"],
  ["konuşmacı olabilir", "speakerWilling"],
  ["konuşmacılarınızı", "speakers"],
  ["15dk", "presentation"],
  ["kaç gün istiyorsunuz", "standDays"],
  ["stand kullanımı istiyorum", "standWanted"],
  ["video", "videoReady"],
  ["interaktif", "interactive"],
];

/** Google Sheets exports wall-clock Istanbul time; exceljs reads it as UTC. */
const TR_OFFSET_MS = 3 * 3600 * 1000;

function cellText(v: ExcelJS.CellValue): string {
  if (v == null) return "";
  if (v instanceof Date) return new Date(v.getTime() - TR_OFFSET_MS).toISOString();
  if (typeof v === "object") {
    if ("richText" in v) return v.richText.map((r) => r.text).join("");
    if ("text" in v) return String(v.text);
    if ("result" in v) return String(v.result ?? "");
  }
  return String(v);
}

const yes = (s: string) => /^evet/i.test(s.trim());

function parseDays(s: string) {
  const nums = [...s.matchAll(/(\d{1,2})\s*Kas/gi)].map((m) => Number(m[1]));
  return FORM_DAYS.filter((d) => nums.includes(Number(d.slice(8, 10))));
}

/** "Ad Soyad - Unvan / Ad Soyad (Unvan)" style free text into name/title pairs. */
export function parseSpeakers(s: string): NamedPerson[] {
  const sep = /\s+[-–]\s+|\s*\/\s*|\s*\(/;
  const chunks = s.split(/\s+\/\s+|;|\n/).flatMap((part) => {
    const pieces = part.split(/\s+ve\s+/i);
    return pieces.length > 1 && pieces.every((p) => sep.test(p)) ? pieces : [part];
  });
  return chunks
    .map((chunk) => {
      const m = chunk.match(sep);
      if (!m || m.index == null) return { name: chunk.trim(), title: "" };
      return {
        name: chunk.slice(0, m.index).trim(),
        title: chunk.slice(m.index + m[0].length).replace(/\)\s*$/, "").trim(),
      };
    })
    .filter((p) => p.name);
}

function parseTimestamp(s: string) {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

/** Imports a Google Forms responses sheet; the newest answer per e-mail wins and meeting answers are kept. */
export async function importStakeholderXlsx(buf: ArrayBuffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ExcelJS.Buffer);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error("Excel dosyasında sayfa yok");
  const header = (ws.getRow(1).values as ExcelJS.CellValue[]).map((v) => cellText(v).toLocaleLowerCase("tr"));
  const index: Record<string, number> = {};
  for (const [needle, key] of COLUMNS) {
    const col = header.findIndex((h, i) => i > 0 && h.includes(needle) && !Object.values(index).includes(i));
    if (col > 0) index[key] = col;
  }
  if (!index.email || !index.companyName) throw new Error("Bu dosya paydaş formu cevapları gibi görünmüyor (e-posta / firma adı sütunu yok).");

  const latest = new Map<string, Record<string, string>>();
  ws.eachRow((row, n) => {
    if (n === 1) return;
    const rec: Record<string, string> = {};
    for (const [key, col] of Object.entries(index)) rec[key] = cellText(row.getCell(col).value).trim();
    const email = (rec.email || "").toLocaleLowerCase("tr");
    if (!email) return;
    const prev = latest.get(email);
    if (!prev || parseTimestamp(rec.submittedAt) >= parseTimestamp(prev.submittedAt)) latest.set(email, rec);
  });

  let created = 0;
  let updated = 0;
  let skipped = 0;
  for (const [email, r] of latest) {
    const submittedAt = parseTimestamp(r.submittedAt);
    const existing = await prisma.stakeholderResponse.findUnique({ where: { email } });
    if (existing && existing.submittedAt > submittedAt) {
      skipped++;
      continue;
    }
    const speakerWilling = yes(r.speakerWilling || "");
    const standWanted = yes(r.standWanted || "");
    const interactive = INTERACTIVE_OPTIONS.find((o) => o.slice(0, 12).toLocaleLowerCase("tr") === (r.interactive || "").slice(0, 12).toLocaleLowerCase("tr")) || r.interactive || "";
    const data = {
      companyName: r.companyName || email,
      theme: r.theme || "",
      headcount: Math.round(Number(r.headcount) || 0),
      days: JSON.stringify(parseDays(r.days || "")),
      speakerWilling,
      speakers: JSON.stringify(speakerWilling ? parseSpeakers(r.speakers || "") : []),
      presentation: yes(r.presentation || ""),
      standWanted,
      standDays: standWanted ? r.standDays || "" : "",
      videoReady: r.videoReady || "",
      interactive,
      submittedAt,
    };
    if (existing) {
      await prisma.stakeholderResponse.update({ where: { email }, data });
      updated++;
    } else {
      await prisma.stakeholderResponse.create({ data: { ...data, email, source: "google-form" } });
      created++;
    }
  }
  return { created, updated, skipped };
}
