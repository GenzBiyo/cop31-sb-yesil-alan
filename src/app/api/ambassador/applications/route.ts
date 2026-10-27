import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { sendMail } from "@/lib/mail";
import { ensureAmbassadorReady } from "@/lib/ambassador-db";
import { ambassadorCardUrl, isAmbassadorAccepted } from "@/lib/ambassador-card";

export async function GET() {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  await ensureAmbassadorReady();
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

  let mailWarning = "";
  const accepted = isAmbassadorAccepted(updated.status);
  const cardUrl = accepted ? ambassadorCardUrl(updated.id) : "";
  if (body.notify !== false && updated.email) {
    const statusLine =
      updated.status === "Kabul edildi"
        ? "Başvurunuz kabul edilmiştir. Yerleştirme ve saha bilgisi ayrıca iletilecektir."
        : updated.status === "Reddedildi"
          ? "Başvurunuz bu tur için kabul edilememiştir. İlginiz için teşekkür ederiz."
          : updated.status === "Yedek"
            ? "Başvurunuz yedek listeye alınmıştır. Kontenjan açılırsa sizinle iletişime geçeceğiz."
            : "Başvurunuz hakkında bilgilendirme:";
    const cardLine = cardUrl
      ? `Tebrik kartınız hazır. JPG olarak indirip sosyal medyada paylaşabilirsiniz:\n${cardUrl}`
      : "";
    const custom = String(body.message || "").trim();
    const note = String(body.adminNote || "").trim();
    const message = custom
      ? [custom, cardLine].filter(Boolean).join("\n\n")
      : [`Sayın ${updated.fullName},`, statusLine, note, cardLine, "T.C. Sağlık Bakanlığı · COP31 Sağlık Pavilionu"]
          .filter(Boolean)
          .join("\n\n");
    try {
      await sendMail(updated.email, `İklim Sağlık Elçisi — ${updated.status}`, message);
    } catch {
      mailWarning = "Karar kaydedildi. E-posta gönderilemedi.";
    }
  }
  return jsonOk({ ...updated, mailWarning, cardUrl });
}
