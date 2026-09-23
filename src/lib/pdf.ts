import PDFDocument from "pdfkit";
import { prisma } from "./prisma";
import { daysLeft } from "./api";
import fs from "fs";
import path from "path";

function fontPath() {
  const candidates = [
    path.join(process.cwd(), "public", "fonts", "DejaVuSans.ttf"),
    "C:\\Windows\\Fonts\\arial.ttf",
    "C:\\Windows\\Fonts\\segoeui.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

export function makePdf() {
  const doc = new PDFDocument({ size: "A4", margin: 48 });
  const font = fontPath();
  if (font) {
    doc.registerFont("Body", font);
    doc.font("Body");
  }
  return doc;
}

function header(doc: PDFKit.PDFDocument, title: string) {
  doc.fillColor("#0077C2").fontSize(10).text("T.C. SAĞLIK BAKANLIĞI", { align: "left" });
  doc.fillColor("#444").fontSize(9).text("Sağlığın Geliştirmesi Genel Müdürlüğü · COP31 Sağlık Pavilionu", { align: "left" });
  doc.moveDown(0.4);
  doc.fillColor("#0077C2").fontSize(16).text(title);
  doc.fillColor("#666").fontSize(9).text("Antalya EXPO Center · Blue Zone · 9–20 Kasım 2026");
  doc.moveTo(48, doc.y + 8).lineTo(547, doc.y + 8).strokeColor("#0077C2").lineWidth(1.2).stroke();
  doc.moveDown(1.2);
  doc.fillColor("#1a1a1a");
}

export async function pdfProgram(): Promise<Buffer> {
  const days = await prisma.thematicDay.findMany({
    include: { agenda: { orderBy: [{ startTime: "asc" }, { sortOrder: "asc" }] } },
    orderBy: { date: "asc" },
  });
  const doc = makePdf();
  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c as Buffer));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));
  header(doc, "Pavilion Programı");
  for (const day of days) {
    if (doc.y > 720) doc.addPage();
    const d = new Date(day.date + "T00:00:00");
    const label = d.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });
    doc.fillColor("#0077C2").fontSize(12).text(`${label} — ${day.themeTr}`);
    doc.fillColor("#444").fontSize(9).text(day.topic1);
    if (day.topic2) doc.text(day.topic2);
    doc.moveDown(0.3);
    if (!day.agenda.length) {
      doc.fillColor("#888").fontSize(9).text("Bu güne henüz oturum eklenmedi.");
    }
    for (const item of day.agenda) {
      doc.fillColor("#1a1a1a").fontSize(10).text(`${item.startTime}–${item.endTime}  ${item.title}`);
      doc.fillColor("#555").fontSize(8).text(`${item.type} · ${item.location}`);
    }
    doc.moveDown(0.7);
  }
  doc.end();
  return done;
}

export async function pdfEvents(): Promise<Buffer> {
  const panels = await prisma.panel.findMany({
    include: { participants: { include: { person: true } } },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
  const doc = makePdf();
  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c as Buffer));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));
  header(doc, "Etkinlikler ve Paneller");
  for (const p of panels) {
    if (doc.y > 720) doc.addPage();
    doc.fillColor("#0077C2").fontSize(12).text(p.title);
    doc.fillColor("#333").fontSize(9).text(`${p.date}  ${p.startTime}–${p.endTime}  ·  ${p.location}`);
    doc.text(`Paydaşlar: ${p.partners || "—"}`);
    doc.text(p.topic);
    const people = p.participants
      .map((x) => `${x.person.name} (${x.role}${x.confirmed ? ", " + x.confirmed : ""})`)
      .join(" · ");
    if (people) doc.fillColor("#555").text(people);
    doc.moveDown(0.6);
  }
  doc.end();
  return done;
}

export async function pdfSpace(): Promise<Buffer> {
  const zones = await prisma.spaceZone.findMany();
  const doc = makePdf();
  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c as Buffer));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));
  header(doc, "Alan Planı");
  doc.fontSize(10).fillColor("#333").text("Sağlık Pavilionu yerleşim özeti. Ölçek şematiktir.");
  doc.moveDown(0.5);
  const originX = 48;
  const originY = doc.y + 8;
  const scale = 4.6;
  for (const z of zones) {
    const x = originX + z.x * scale;
    const y = originY + z.y * scale;
    const w = z.w * scale;
    const h = z.h * scale;
    doc.save().rect(x, y, w, h).fillAndStroke(z.color, "#1a1a1a");
    doc.fillColor("#fff").fontSize(7).text(z.name, x + 3, y + 3, { width: w - 6 });
    doc.restore();
  }
  doc.y = originY + 70 * scale + 16;
  doc.fillColor("#1a1a1a").fontSize(11).text("Bölgeler");
  for (const z of zones) {
    if (doc.y > 760) doc.addPage();
    doc.fontSize(9).fillColor(z.color).text("■ ", { continued: true });
    doc.fillColor("#1a1a1a").text(`${z.name} — ${z.description}`);
  }
  doc.end();
  return done;
}

export async function pdfCompanyKit(companyId?: string): Promise<Buffer> {
  const company = companyId
    ? await prisma.company.findUnique({ where: { id: companyId }, include: { rules: true } })
    : null;
  const todos = await prisma.todo.findMany({
    where: { workPackage: { contains: "Paydaş" } },
    orderBy: { no: "asc" },
  });
  const doc = makePdf();
  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c as Buffer));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));
  header(doc, "Firma Hazırlık Dökümanı");
  if (company) {
    doc.fontSize(12).fillColor("#0077C2").text(company.name);
    doc.fontSize(9).fillColor("#333").text(`${company.scope} · ${company.topic}`);
    doc.text(`Katılım: ${company.participationDates}`);
    doc.text(`Katkı: ${company.contribution}`);
    doc.text(`Stant: ${company.booth || "atanacak"}`);
    doc.moveDown();
    doc.fontSize(11).fillColor("#0077C2").text("Size atanan kurallar");
    for (const r of company.rules) {
      const left = daysLeft(r.dueDate);
      doc.fontSize(9).fillColor("#1a1a1a").text(`${r.title}  [${r.status}]  son tarih: ${r.dueDate}${left != null ? ` (${left} gün)` : ""}`);
      doc.fillColor("#555").text(r.body);
      doc.moveDown(0.3);
    }
  } else {
    doc.fontSize(10).text("Bu paket tüm firma yetkilileri için ortak hazırlık rehberidir.");
  }
  doc.moveDown();
  doc.fontSize(11).fillColor("#0077C2").text("Pavilion kuralları");
  const rules = [
    "Blue Zone akreditasyonu olmadan sahaya girilemez.",
    "Tek kullanımlık plastik kullanılmaz; sıfır atık protokolü geçerlidir.",
    "Görsel kimlikte T.C. Sağlık Bakanlığı ve COP31 logoları birlikte kullanılır.",
    "Ses seviyesi bitişik oturumları etkilemeyecek düzeyde tutulur.",
    "Canlı yayın ve fotoğraf için protokol ekibinden onay alınır.",
    "Kurulum 2–8 Kasım, söküm 20–23 Kasım penceresindedir.",
  ];
  for (const r of rules) doc.fontSize(9).fillColor("#1a1a1a").text(`• ${r}`);
  if (todos.length) {
    doc.moveDown();
    doc.fontSize(11).fillColor("#0077C2").text("Paydaş koordinasyon maddeleri");
    for (const t of todos) doc.fontSize(9).text(`${t.no}. ${t.activity}`);
  }
  doc.end();
  return done;
}
