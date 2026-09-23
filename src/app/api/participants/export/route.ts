import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, withUser } from "@/lib/api";

export async function GET() {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const rows = await prisma.eventSignup.findMany({
    include: { visitor: true, event: true },
    orderBy: { createdAt: "desc" },
  });
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Katılımcılar");
  ws.addRow([
    "Tarih",
    "Etkinlik",
    "Tür",
    "Firma / konu",
    "Ad soyad",
    "E-posta",
    "Telefon",
    "Kurum",
    "Şehir",
    "Ziyaretçi tipi",
    "Elçi / kaynak",
    "Puan",
    "Hediye",
    "Kayıt kanalı",
  ]);
  for (const r of rows) {
    ws.addRow([
      r.createdAt.toISOString(),
      r.event.title,
      r.event.type,
      `${r.event.companyName} / ${r.event.topic}`,
      r.visitor.fullName,
      r.visitor.email,
      r.visitor.phone,
      r.visitor.organization,
      r.visitor.city,
      r.visitor.visitorType,
      r.collectedByName || "—",
      r.score,
      r.prize,
      r.collectedByRole,
    ]);
  }
  const buf = Buffer.from(await wb.xlsx.writeBuffer());
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="COP31-katilimcilar.xlsx"',
    },
  });
}
