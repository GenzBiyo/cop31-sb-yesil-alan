import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { broadcast } from "@/lib/realtime";
import { sendMail } from "@/lib/mail";
import { notifyDevices } from "@/lib/visitor-app";

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
  const title = String(body.title || "").trim();
  const text = String(body.body || "").trim();
  if (!title || !text) return jsonError("Başlık ve metin gerekli");
  const audience = String(body.role || "");
  const toVisitors = audience === "ZIYARETCI" || audience === "HERKES";
  const toAccounts = audience !== "ZIYARETCI";
  const announcement = await prisma.announcement.create({
    data: {
      title,
      body: text,
      createdById: user.id,
      emailStatus: "Gönderiliyor",
    },
  });
  const targets = toAccounts
    ? await prisma.user.findMany({
        where: audience === "FIRMA" || audience === "SAGLIK" ? { role: audience } : { role: { in: ["FIRMA", "SAGLIK"] } },
      })
    : [];
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
  let visitors = 0;
  if (toVisitors) {
    const devices = await prisma.appDevice.findMany({
      where: { role: { in: ["ziyaretci", ""] } },
      select: { id: true },
    });
    visitors = devices.length
      ? await notifyDevices(devices.map((device) => device.id), title, text, "broadcast", announcement.id)
      : 0;
  }
  const parts = [];
  if (toAccounts) parts.push(`${sent}/${targets.length} e-posta`);
  if (toVisitors) parts.push(`${visitors} ziyaretçi`);
  const updated = await prisma.announcement.update({
    where: { id: announcement.id },
    data: { emailStatus: parts.join(" · ") },
  });
  broadcast({ type: "announcement" });
  broadcast({ type: "inbox" });
  return jsonOk(updated, 201);
}
