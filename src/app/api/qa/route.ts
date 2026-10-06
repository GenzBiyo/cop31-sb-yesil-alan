import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { broadcast } from "@/lib/realtime";

export async function GET() {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const where =
    user.role === "FIRMA"
      ? { type: "qa", OR: [{ companyId: user.companyId }, { companyId: null }] }
      : { type: "qa" };
  const threads = await prisma.thread.findMany({
    where,
    include: { messages: { orderBy: { createdAt: "asc" } } },
    orderBy: { updatedAt: "desc" },
  });
  const users = await prisma.user.findMany({ select: { id: true, name: true, role: true } });
  return jsonOk({ me: { id: user.id, role: user.role }, threads, users });
}

export async function POST(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const body = await req.json();
  if (body.action === "close") {
    if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
    const t = await prisma.thread.update({ where: { id: body.id }, data: { status: "Kapalı" } });
    broadcast({ type: "qa" });
    return jsonOk(t);
  }
  const text = String(body.body || "").trim().slice(0, 2000);
  if (body.threadId) {
    if (text.length < 1) return jsonError("Mesaj yazın");
    const thread = await prisma.thread.findUnique({ where: { id: body.threadId } });
    if (!thread || thread.status === "Kapalı") return jsonError("Konu kapalı veya yok", 400);
    if (user.role === "FIRMA" && thread.companyId && thread.companyId !== user.companyId) return jsonError("Yetkiniz yok", 403);
    const msg = await prisma.chatMessage.create({
      data: { threadId: thread.id, authorId: user.id, body: text },
    });
    await prisma.thread.update({ where: { id: thread.id }, data: { updatedAt: new Date() } });
    broadcast({ type: "qa", payload: { threadId: thread.id } });
    return jsonOk(msg, 201);
  }
  const title = String(body.title || "").trim().slice(0, 140);
  if (title.length < 3 || text.length < 1) return jsonError("Soru başlığı ve metni gerekli");
  const thread = await prisma.thread.create({
    data: {
      type: "qa",
      title,
      status: "Açık",
      companyId: user.role === "FIRMA" ? user.companyId : body.companyId || null,
      createdById: user.id,
    },
  });
  await prisma.chatMessage.create({
    data: { threadId: thread.id, authorId: user.id, body: text },
  });
  broadcast({ type: "qa" });
  return jsonOk(await prisma.thread.findUnique({ where: { id: thread.id }, include: { messages: true } }), 201);
}
