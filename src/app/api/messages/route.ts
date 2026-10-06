import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { broadcast } from "@/lib/realtime";
import { canManage } from "@/lib/auth";
import { ensureCompanyAccounts } from "@/lib/company-accounts";

function textOf(value: unknown) {
  return String(value || "").trim().slice(0, 2000);
}

export async function GET() {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const manage = canManage(user.role);
  if (manage) await ensureCompanyAccounts();

  const [companies, threads, users] = await Promise.all([
    prisma.company.findMany({
      where: manage ? {} : { id: user.companyId || "__none__" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.thread.findMany({
      where: manage ? { type: "inbox" } : { type: "inbox", companyId: user.companyId || undefined },
      include: { messages: { orderBy: { createdAt: "asc" } } },
      orderBy: { updatedAt: "asc" },
    }),
    prisma.user.findMany({ select: { id: true, name: true, role: true } }),
  ]);

  const people = new Map(users.map((item) => [item.id, item]));
  const byCompany = new Map<string, typeof threads>();
  for (const thread of threads) {
    if (!thread.companyId) continue;
    const list = byCompany.get(thread.companyId) || [];
    list.push(thread);
    byCompany.set(thread.companyId, list);
  }

  const conversations = companies.map((company) => {
    const list = byCompany.get(company.id) || [];
    const messages = list.flatMap((thread) =>
      thread.messages.map((message) => {
        const author = people.get(message.authorId);
        const staff = author?.role === "ADMIN" || author?.role === "SAGLIK";
        return {
          id: message.id,
          body: message.body,
          createdAt: message.createdAt,
          authorName: author?.name || "Kullanıcı",
          mine: message.authorId === user.id,
          side: staff ? "bakanlik" : "firma",
          topic: list.length > 1 ? thread.title : "",
        };
      }),
    );
    messages.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
    const last = messages[messages.length - 1];
    return {
      companyId: company.id,
      companyName: company.name,
      lastBody: last?.body || "",
      lastAt: last?.createdAt || null,
      needsReply: Boolean(last && (manage ? last.side === "firma" : last.side === "bakanlik")),
      messages,
    };
  });

  conversations.sort((a, b) => {
    const at = a.lastAt ? +new Date(a.lastAt) : 0;
    const bt = b.lastAt ? +new Date(b.lastAt) : 0;
    if (at !== bt) return bt - at;
    return a.companyName.localeCompare(b.companyName, "tr");
  });

  return jsonOk({
    me: { id: user.id, role: user.role, name: user.name },
    conversations,
  });
}

export async function POST(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const body = await req.json().catch(() => ({}));
  const text = textOf(body.body);
  if (text.length < 1) return jsonError("Mesaj yazın");

  if (body.threadId && !body.companyId) {
    const thread = await prisma.thread.findUnique({ where: { id: String(body.threadId) } });
    if (!thread || thread.type !== "inbox") return jsonError("Konu yok", 404);
    if (user.role === "FIRMA" && thread.companyId !== user.companyId) return jsonError("Yetkiniz yok", 403);
    const message = await prisma.chatMessage.create({
      data: { threadId: thread.id, authorId: user.id, body: text },
    });
    await prisma.thread.update({ where: { id: thread.id }, data: { updatedAt: new Date() } });
    broadcast({ type: "message", payload: { threadId: thread.id } });
    return jsonOk(message, 201);
  }

  const companyId = user.role === "FIRMA" ? user.companyId : String(body.companyId || "");
  if (!companyId) return jsonError(user.role === "FIRMA" ? "Hesabınıza bağlı firma yok" : "Firma seçin");
  if (user.role === "FIRMA" && companyId !== user.companyId) return jsonError("Yetkiniz yok", 403);
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { id: true, name: true } });
  if (!company) return jsonError("Firma bulunamadı", 404);

  let thread = await prisma.thread.findFirst({
    where: { type: "inbox", companyId },
    orderBy: { updatedAt: "desc" },
  });
  if (!thread) {
    thread = await prisma.thread.create({
      data: {
        type: "inbox",
        title: company.name,
        companyId,
        createdById: user.id,
      },
    });
  }
  await prisma.chatMessage.create({
    data: { threadId: thread.id, authorId: user.id, body: text },
  });
  await prisma.thread.update({ where: { id: thread.id }, data: { updatedAt: new Date() } });
  broadcast({ type: "message", payload: { companyId } });
  return jsonOk({ ok: true }, 201);
}
