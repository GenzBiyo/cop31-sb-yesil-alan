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

function room(doc: PDFKit.PDFDocument) {
  if (doc.y > 720) doc.addPage();
}

export async function pdfProgram(): Promise<Buffer> {
  const days = await prisma.thematicDay.findMany({
    include: { agenda: { orderBy: [{ startTime: "asc" }, { sortOrder: "asc" }] } },
    orderBy: { date: "asc" },
  });
  const talks = await prisma.panel.findMany({
    where: { kind: "sunum", status: { notIn: ["Reddedildi", "Onay bekliyor"] } },
    include: { participants: { include: { person: true } } },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
  const events = await prisma.pavilionEvent.findMany({
    where: { approvalStatus: { notIn: ["Onay bekliyor", "Reddedildi"] } },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
  const doc = makePdf();
  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c as Buffer));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));
  header(doc, "Pavilion Programı");
  doc.fontSize(9).fillColor("#444").text("Günlük oturumlar, onaylı etkinlikler ve konuşmalar.");
  doc.moveDown(0.4);
  for (const day of days) {
    room(doc);
    const d = new Date(day.date + "T00:00:00");
    const label = d.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });
    doc.fillColor("#0077C2").fontSize(12).text(`${label} — ${day.themeTr}`);
    doc.fillColor("#444").fontSize(9).text(day.topic1);
    if (day.topic2) doc.text(day.topic2);
    doc.moveDown(0.3);
    const dayTalks = talks.filter((item) => item.date === day.date);
    const dayEvents = events.filter((item) => item.date === day.date);
    if (!day.agenda.length && !dayTalks.length && !dayEvents.length) {
      doc.fillColor("#888").fontSize(9).text("Bu güne henüz oturum eklenmedi.");
    }
    for (const item of day.agenda) {
      room(doc);
      doc.fillColor("#1a1a1a").fontSize(10).text(`${item.startTime}–${item.endTime}  ${item.title}`);
      doc.fillColor("#555").fontSize(8).text(`${item.type} · ${item.location}`);
    }
    for (const talk of dayTalks) {
      if (day.agenda.some((item) => item.panelId === talk.id || item.title === talk.title)) continue;
      room(doc);
      const people = talk.participants.map((row) => row.person.name).filter(Boolean).join(", ");
      doc.fillColor("#1a1a1a").fontSize(10).text(`${talk.startTime}–${talk.endTime}  ${talk.title}`);
      doc.fillColor("#555").fontSize(8).text(`Konuşma · ${talk.location}${people ? ` · ${people}` : ""}`);
    }
    for (const event of dayEvents) {
      room(doc);
      doc.fillColor("#1a1a1a").fontSize(10).text(`${event.startTime}–${event.endTime}  ${event.title}`);
      doc.fillColor("#555").fontSize(8).text(`Etkinlik · ${event.type}${event.companyName ? ` · ${event.companyName}` : ""} · ${event.location}`);
    }
    doc.moveDown(0.7);
  }
  const dated = new Set(days.map((day) => day.date));
  const extraTalks = talks.filter((item) => !dated.has(item.date));
  const extraEvents = events.filter((item) => !dated.has(item.date));
  if (extraTalks.length || extraEvents.length) {
    room(doc);
    doc.fillColor("#0077C2").fontSize(12).text("Tarihi programa bağlanmayan kayıtlar");
    for (const talk of extraTalks) {
      room(doc);
      doc.fillColor("#1a1a1a").fontSize(10).text(`${talk.date || "Tarih yok"}  ${talk.startTime}–${talk.endTime}  ${talk.title}`);
      doc.fillColor("#555").fontSize(8).text("Konuşma");
    }
    for (const event of extraEvents) {
      room(doc);
      doc.fillColor("#1a1a1a").fontSize(10).text(`${event.date || "Tarih yok"}  ${event.startTime}–${event.endTime}  ${event.title}`);
      doc.fillColor("#555").fontSize(8).text(`Etkinlik · ${event.companyName || event.type}`);
    }
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
  const doc = makePdf();
  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c as Buffer));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));
  header(doc, "Alan Planı");
  doc.fontSize(10).fillColor("#333").text("T.C. Sağlık Bakanlığı fuar standı. Ölçü 16.000 mm × 5.000 mm, yükseklik 3.200 mm. Üstte ön görünüş, altta plan ve yan görünüşler.");
  doc.moveDown(0.4);
  const image = path.join(process.cwd(), "public", "brand", "fuar-standi.jpg");
  if (fs.existsSync(image)) {
    doc.image(image, 48, doc.y, { fit: [500, 640], align: "center" });
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

export async function pdfPavilionRules(text: string): Promise<Buffer> {
  const doc = makePdf();
  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c as Buffer));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));
  header(doc, "Pavilyon Kullanım Kuralları");
  for (const raw of text.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line || /^\|?\s*-{3,}/.test(line)) continue;
    if (doc.y > 760) doc.addPage();
    if (line.startsWith("# ")) {
      doc.moveDown(0.4).fillColor("#0077C2").fontSize(14).text(line.slice(2));
    } else if (line.startsWith("## ")) {
      doc.moveDown(0.3).fillColor("#0077C2").fontSize(12).text(line.slice(3));
    } else if (line.startsWith("|")) {
      const cells = line.split("|").slice(1, -1).map((cell) => cell.trim()).filter(Boolean);
      doc.fillColor("#1a1a1a").fontSize(9).text(cells.join("  ·  "));
    } else {
      const bullet = line.startsWith("- ") ? `• ${line.slice(2)}` : line;
      doc.fillColor("#1a1a1a").fontSize(10).text(bullet, { width: 500 });
    }
  }
  doc.end();
  return done;
}
