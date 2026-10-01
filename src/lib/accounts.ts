import { randomBytes } from "crypto";
import { prisma } from "./prisma";
import { STANDARD_RULES } from "./company";
import { sendMail } from "./mail";
import { broadcast } from "./realtime";
import { accountKind } from "./account-kinds";

const SIGN = "T.C. Sağlık Bakanlığı · COP31 Sağlık Pavilionu";

export const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  phone: true,
  title: true,
  accountStatus: true,
  createdAt: true,
  companyId: true,
  company: {
    select: { id: true, name: true, kind: true, status: true, participationDates: true, booth: true, scope: true, topic: true, contribution: true, website: true },
  },
} as const;

export function tempPassword() {
  return randomBytes(9).toString("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, 10) + "!7";
}

/** Sets a user's account status and applies company side effects, mail and inbox notice. */
export async function applyAccountStatus(userId: string, accountStatus: string, message?: string) {
  const target = await prisma.user.findUnique({ where: { id: userId }, include: { company: true } });
  if (!target) throw new Error("Hesap yok");
  const updated = await prisma.user.update({
    where: { id: target.id },
    data: { accountStatus },
    include: { company: true },
  });
  const kind = accountKind(target.company?.kind);

  if (accountStatus === "Onaylandı" && target.companyId) {
    await prisma.company.update({
      where: { id: target.companyId },
      data: { status: "Onaylandı", contactEmail: target.email, contactName: target.name, contactPhone: target.phone },
    });
    const ruleCount = await prisma.companyRule.count({ where: { companyId: target.companyId } });
    if (ruleCount === 0 && kind.firmTools) {
      await prisma.companyRule.createMany({
        data: STANDARD_RULES.map((r) => ({ ...r, companyId: target.companyId!, status: "Bekliyor" })),
      });
    }
  }
  if ((accountStatus === "Reddedildi" || accountStatus === "Askıda") && target.companyId) {
    const others = await prisma.user.count({
      where: { companyId: target.companyId, accountStatus: "Onaylandı", id: { not: target.id } },
    });
    if (others === 0) {
      await prisma.company.update({ where: { id: target.companyId }, data: { status: accountStatus } });
    }
  }

  const org = target.company?.name || kind.label;
  const text =
    message ||
    (accountStatus === "Onaylandı"
      ? `Sayın ${target.name},\n\n${org} ${kind.label.toLocaleLowerCase("tr-TR")} hesabınız onaylandı. Giriş: /giris/firmalar\n\n${SIGN}`
      : accountStatus === "Askıda"
        ? `Sayın ${target.name},\n\nHesabınız geçici olarak askıya alındı. Sağlık Pavilionu ekibiyle iletişime geçin.\n\n${SIGN}`
        : accountStatus === "Reddedildi"
          ? `Sayın ${target.name},\n\nHesap başvurunuz bu aşamada onaylanmamıştır.\n\n${SIGN}`
          : "");
  if (text) {
    await sendMail(target.email, `COP31 hesabı — ${accountStatus}`, text);
    await prisma.inboxItem.create({ data: { userId: target.id, title: `Hesap durumu: ${accountStatus}`, body: text } });
  }
  broadcast({ type: "inbox" });
  broadcast({ type: "account" });
  return updated;
}
