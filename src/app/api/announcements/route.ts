import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { broadcast } from "@/lib/realtime";
import { sendMail } from "@/lib/mail";

export async function GET() {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const announcements = await prisma.announcement.findMany({ orderBy: { createdAt: "desc" } });
  const emails = await prisma.emailLog.findMany({ orderBy: { createdAt: "desc" }, take: 40 });
  return jsonOk({ announcements, emails });
}

export async function POST(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const body = await req.json();
  const announcement = await prisma.announcement.create({
    data: {
      title: body.title,
      body: body.body,
      createdById: user.id,
      emailStatus: "Gönderiliyor",
    },
  });
  const targets = await prisma.user.findMany({
    where: body.role ? { role: body.role } : { role: { in: ["FIRMA", "SAGLIK"] } },
  });
  let sent = 0;
  for (const t of targets) {
    await prisma.inboxItem.create({
      data: {
        userId: t.id,
        announcementId: announcement.id,
        title: announcement.title,
        body: announcement.body,
      },
    });
    try {
      await sendMail(t.email, `[COP31 SB] ${announcement.title}`, announcement.body);
      sent += 1;
    } catch {
      /* already logged */
    }
  }
  const updated = await prisma.announcement.update({
    where: { id: announcement.id },
    data: { emailStatus: `${sent}/${targets.length} e-posta` },
  });
  broadcast({ type: "announcement" });
  broadcast({ type: "inbox" });
  return jsonOk(updated, 201);
}
