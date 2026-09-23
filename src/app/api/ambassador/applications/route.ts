import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { sendMail } from "@/lib/mail";
import { ensureAmbassadorForm } from "@/lib/ambassador-db";

export async function GET() {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  await ensureAmbassadorForm();
  const applications = await prisma.ambassadorApplication.findMany({
    include: { placements: { include: { activity: true } } },
    orderBy: { createdAt: "desc" },
  });
  return jsonOk(applications);
}

export async function PATCH(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const body = await req.json();
  if (!body.id) return jsonError("id gerekli");
  const current = await prisma.ambassadorApplication.findUnique({ where: { id: body.id } });
  if (!current) return jsonError("Başvuru yok", 404);

  const data: { status?: string; adminNote?: string } = {};
  if (body.status) data.status = body.status;
  if (body.adminNote !== undefined) data.adminNote = body.adminNote;
  const updated = await prisma.ambassadorApplication.update({ where: { id: body.id }, data });

  if (body.notify !== false) {
    const statusLine =
      updated.status === "Kabul edildi"
        ? "Başvurunuz kabul edilmiştir. Yerleştirme ve saha bilgisi ayrıca iletilecektir."
        : updated.status === "Reddedildi"
          ? "Başvurunuz bu tur için kabul edilememiştir. İlginiz için teşekkür ederiz."
          : updated.status === "Yedek"
            ? "Başvurunuz yedek listeye alınmıştır. Kontenjan açılırsa sizinle iletişime geçeceğiz."
            : "Başvurunuz hakkında bilgilendirme:";
    const message =
      body.message ||
      `Sayın ${updated.fullName},\n\n${statusLine}\n\n${body.adminNote || ""}\n\nT.C. Sağlık Bakanlığı · COP31 Sağlık Pavilionu`;
    await sendMail(updated.email, `İklim Sağlık Elçisi — ${updated.status}`, message);
  }
  return jsonOk(updated);
}
