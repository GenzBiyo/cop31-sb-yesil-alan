import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { STANDARD_RULES } from "@/lib/company";
import { sendMail } from "@/lib/mail";
import { broadcast } from "@/lib/realtime";

export async function GET() {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (user.role !== "ADMIN") return jsonError("Yetkiniz yok", 403);
  const accounts = await prisma.user.findMany({
    where: { role: "FIRMA" },
    include: { company: true },
    orderBy: { createdAt: "desc" },
  });
  return jsonOk(accounts);
}

export async function PATCH(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (user.role !== "ADMIN") return jsonError("Yetkiniz yok", 403);
  const body = await req.json();
  if (!body.id || !body.accountStatus) return jsonError("id ve hesap durumu gerekli");
  const target = await prisma.user.findUnique({ where: { id: body.id }, include: { company: true } });
  if (!target) return jsonError("Hesap yok", 404);

  const updated = await prisma.user.update({
    where: { id: target.id },
    data: { accountStatus: body.accountStatus },
    include: { company: true },
  });

  if (body.accountStatus === "Onaylandı" && target.companyId) {
    await prisma.company.update({
      where: { id: target.companyId },
      data: { status: "Onaylandı", contactEmail: target.email, contactName: target.name, contactPhone: target.phone },
    });
    const ruleCount = await prisma.companyRule.count({ where: { companyId: target.companyId } });
    if (ruleCount === 0) {
      await prisma.companyRule.createMany({
        data: STANDARD_RULES.map((r) => ({ ...r, companyId: target.companyId!, status: "Bekliyor" })),
      });
    }
  }
  if (body.accountStatus === "Reddedildi" && target.companyId) {
    const others = await prisma.user.count({
      where: { companyId: target.companyId, accountStatus: "Onaylandı", id: { not: target.id } },
    });
    if (others === 0) {
      await prisma.company.update({ where: { id: target.companyId }, data: { status: "Reddedildi" } });
    }
  }

  const message =
    body.message ||
    (body.accountStatus === "Onaylandı"
      ? `Sayın ${target.name},\n\n${target.company?.name || "Firma"} hesabınız onaylandı. Firmalar kapısından giriş yapabilirsiniz: /giris/firmalar\n\nT.C. Sağlık Bakanlığı · COP31 Sağlık Pavilionu`
      : `Sayın ${target.name},\n\nHesap başvurunuz bu aşamada onaylanmamıştır.\n\nT.C. Sağlık Bakanlığı · COP31 Sağlık Pavilionu`);
  await sendMail(target.email, `COP31 firma hesabı — ${body.accountStatus}`, message);
  await prisma.inboxItem.create({
    data: {
      userId: target.id,
      title: `Hesap durumu: ${body.accountStatus}`,
      body: message,
    },
  });
  broadcast({ type: "inbox" });
  broadcast({ type: "account" });
  return jsonOk(updated);
}
