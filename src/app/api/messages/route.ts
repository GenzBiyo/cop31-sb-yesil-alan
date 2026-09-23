import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { broadcast } from "@/lib/realtime";

export async function GET() {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const where =
    user.role === "FIRMA"
      ? { type: "inbox", companyId: user.companyId || undefined }
      : { type: "inbox" };
  const threads = await prisma.thread.findMany({
    where,
    include: { messages: { orderBy: { createdAt: "asc" } } },
    orderBy: { updatedAt: "desc" },
  });
  const users = await prisma.user.findMany({ select: { id: true, name: true, role: true, email: true } });
  const companies = await prisma.company.findMany({ select: { id: true, name: true } });
  return jsonOk({ threads, users, companies });
}

export async function POST(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const body = await req.json();
  if (body.threadId) {
    const thread = await prisma.thread.findUnique({ where: { id: body.threadId } });
    if (!thread) return jsonError("Konu yok", 404);
    if (user.role === "FIRMA" && thread.companyId !== user.companyId) return jsonError("Yetkiniz yok", 403);
    const msg = await prisma.chatMessage.create({
      data: { threadId: thread.id, authorId: user.id, body: body.body },
    });
    await prisma.thread.update({ where: { id: thread.id }, data: { updatedAt: new Date() } });
    broadcast({ type: "message", payload: { threadId: thread.id } });
    return jsonOk(msg, 201);
  }
  const companyId = user.role === "FIRMA" ? user.companyId : body.companyId;
  const thread = await prisma.thread.create({
    data: {
      type: "inbox",
      title: body.title || "Yeni mesaj",
      companyId,
      createdById: user.id,
    },
    include: { messages: true },
  });
  if (body.body) {
    await prisma.chatMessage.create({
      data: { threadId: thread.id, authorId: user.id, body: body.body },
    });
  }
  broadcast({ type: "message" });
  return jsonOk(await prisma.thread.findUnique({ where: { id: thread.id }, include: { messages: true } }), 201);
}
