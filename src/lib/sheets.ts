import ExcelJS from "exceljs";
import { prisma } from "./prisma";
import { THEME_TR } from "./constants";

const UA = "Mozilla/5.0 COP31-SB-Hazirlik-App";

function cell(row: ExcelJS.Row, i: number) {
  const v = row.getCell(i).value;
  if (v == null) return "";
  if (typeof v === "object" && v && "text" in v) return String((v as { text: string }).text);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
}

function excelDate(v: string) {
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  const m = v.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  const n = Number(v);
  if (!Number.isNaN(n) && n > 20000) {
    const d = new Date(Math.round((n - 25569) * 86400 * 1000));
    return d.toISOString().slice(0, 10);
  }
  return v;
}

function pct(v: string) {
  const n = Number(String(v).replace("%", "").replace(",", "."));
  if (Number.isNaN(n)) return 0;
  return n <= 1 ? Math.round(n * 100) : Math.round(n);
}

export async function fetchWorkbook(sheetId: string) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
  const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
  if (!res.ok) throw new Error(`Google Sheet indirilemedi (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ExcelJS.Buffer);
  return wb;
}

export async function loadWorkbookFromBuffer(buf: Buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ExcelJS.Buffer);
  return wb;
}

export async function importTodosFromWorkbook(wb: ExcelJS.Workbook) {
  const ws = wb.worksheets[0];
  let imported = 0;
  ws.eachRow((row, rowNumber) => {
    if (rowNumber < 8) return;
    const no = Number(cell(row, 1));
    if (!no) return;
    imported += 1;
    void prisma.todo.upsert({
      where: { id: `todo-${no}` },
      update: {},
      create: { id: `todo-${no}`, no, workPackage: "", activity: "" },
    });
  });

  const ops = [] as Promise<unknown>[];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber < 8) return;
    const no = Number(cell(row, 1));
    if (!no) return;
    const data = {
      no,
      workPackage: cell(row, 2),
      activity: cell(row, 3),
      detail: cell(row, 4),
      startDate: excelDate(cell(row, 5)),
      dueDate: excelDate(cell(row, 6)),
      unit: cell(row, 7),
      owner: cell(row, 8),
      status: cell(row, 9) || "Başlanmadı",
      progress: pct(cell(row, 10)),
      risk: cell(row, 12),
      priority: cell(row, 13) || "Orta",
      notes: cell(row, 14),
    };
    ops.push(
      prisma.todo.upsert({
        where: { id: `imported-${no}` },
        update: data,
        create: { id: `imported-${no}`, ...data },
      }).catch(async () => {
        const existing = await prisma.todo.findFirst({ where: { no } });
        if (existing) await prisma.todo.update({ where: { id: existing.id }, data });
        else await prisma.todo.create({ data });
      })
    );
  });
  await Promise.all(ops);
  return { imported: ops.length };
}

export async function mergeTodosFromWorkbook(wb: ExcelJS.Workbook) {
  const ws = wb.worksheets[0];
  let updated = 0;
  let created = 0;
  const rows: {
    no: number;
    workPackage: string;
    activity: string;
    detail: string;
    startDate: string;
    dueDate: string;
    unit: string;
    owner: string;
    status: string;
    progress: number;
    risk: string;
    priority: string;
    notes: string;
  }[] = [];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber < 8) return;
    const no = Number(cell(row, 1));
    if (!no) return;
    rows.push({
      no,
      workPackage: cell(row, 2),
      activity: cell(row, 3),
      detail: cell(row, 4),
      startDate: excelDate(cell(row, 5)),
      dueDate: excelDate(cell(row, 6)),
      unit: cell(row, 7),
      owner: cell(row, 8),
      status: cell(row, 9) || "Başlanmadı",
      progress: pct(cell(row, 10)),
      risk: cell(row, 12),
      priority: cell(row, 13) || "Orta",
      notes: cell(row, 14),
    });
  });
  for (const data of rows) {
    const existing = await prisma.todo.findFirst({ where: { no: data.no } });
    if (existing) {
      await prisma.todo.update({ where: { id: existing.id }, data });
      updated += 1;
    } else {
      await prisma.todo.create({ data });
      created += 1;
    }
  }
  return { updated, created, total: rows.length };
}

export async function exportTodosWorkbook() {
  const todos = await prisma.todo.findMany({ orderBy: { no: "asc" } });
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Kontrol Listesi");
  ws.addRow(["COP31 SAĞLIK PAVILION (YEŞİL ALAN) HAZIRLIK KONTROL LİSTESİ"]);
  ws.addRow(["T.C. Sağlık Bakanlığı SGGM — COP31 Antalya, 9-20 Kasım 2026"]);
  ws.addRow([]);
  ws.addRow([]);
  ws.addRow([]);
  ws.addRow([]);
  ws.addRow([
    "No",
    "İş Paketi",
    "Faaliyet",
    "Açıklama / Detay",
    "Başlangıç Tarihi",
    "Bitiş Tarihi",
    "Sorumlu Birim",
    "Sorumlu Kişi",
    "Durum",
    "Tamamlanma %",
    "Kalan Gün",
    "Gecikme / Risk",
    "Öncelik",
    "Notlar",
  ]);
  const today = new Date();
  for (const t of todos) {
    const due = t.dueDate ? new Date(t.dueDate) : null;
    const remaining = due ? Math.ceil((due.getTime() - today.getTime()) / 86400000) : "";
    ws.addRow([
      t.no,
      t.workPackage,
      t.activity,
      t.detail,
      t.startDate,
      t.dueDate,
      t.unit,
      t.owner,
      t.status,
      t.progress,
      remaining,
      t.risk,
      t.priority,
      t.notes,
    ]);
  }
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export async function mergeCalendarFromWorkbook(wb: ExcelJS.Workbook) {
  const ws = wb.worksheets.find((s) => /calendar|panel/i.test(s.name));
  if (!ws) return { days: 0 };
  let days = 0;
  ws.eachRow((row, rowNumber) => {
    if (rowNumber < 3) return;
    const date = excelDate(cell(row, 2));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    days += 1;
    void prisma.thematicDay.upsert({
      where: { date },
      update: {
        themeEn: cell(row, 3),
        themeTr: THEME_TR[date] || cell(row, 3),
        topic1: cell(row, 4),
        topic2: cell(row, 5),
      },
      create: {
        date,
        themeEn: cell(row, 3),
        themeTr: THEME_TR[date] || cell(row, 3),
        topic1: cell(row, 4),
        topic2: cell(row, 5),
      },
    });
  });
  return { days };
}
