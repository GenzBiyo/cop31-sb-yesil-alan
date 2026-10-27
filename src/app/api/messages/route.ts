import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { broadcast } from "@/lib/realtime";
import { accountKind } from "@/lib/account-kinds";
import { MINISTRY_UNITS } from "@/lib/stakeholder-form";
import type { SessionUser } from "@/lib/auth";

function textOf(value: unknown) {
  return String(value || "").trim().slice(0, 2000);
}

function staff(role: string) {
  return role === "ADMIN" || role === "SAGLIK";
}

function companyEndpoint(id: string) {
  return `c:${id}`;
}

function unitEndpoint(unit: string) {
  return `u:${unit}`;
}

function pairTitle(a: string, b: string) {
  return `dm:${[a, b].sort().join("|")}`;
}

function parsePair(title: string): [string, string] | null {
  if (!title.startsWith("dm:")) return null;
  const parts = title.slice(3).split("|");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return [parts[0], parts[1]];
}

function isUnit(endpoint: string) {
  return MINISTRY_UNITS.includes(endpoint.slice(2)) && endpoint.startsWith("u:");
}

type Person = { id: string; name: string; role: string; companyId: string | null };

function mineMessage(author: Person | undefined, user: SessionUser, bothUnits: boolean) {
  if (!author) return false;
  if (bothUnits) return author.id === user.id;
  if (staff(user.role)) return staff(author.role);
  return author.companyId === user.companyId || author.id === user.id;
}

export async function GET() {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const isStaff = staff(user.role);
  const mine = user.companyId ? companyEndpoint(user.companyId) : "";

  const [companies, users, dmThreads, legacy] = await Promise.all([
    prisma.company.findMany({
      where: { status: "Onaylandı" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, kind: true, status: true },
    }),
    prisma.user.findMany({ select: { id: true, name: true, role: true, companyId: true } }),
    prisma.thread.findMany({
      where: isStaff ? { type: "dm" } : { type: "dm", title: { contains: mine || "__none__" } },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    }),
    prisma.thread.findMany({
      where: isStaff
        ? { type: { in: ["inbox", "qa"] } }
        : { type: { in: ["inbox", "qa"] }, companyId: user.companyId || "__none__" },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    }),
  ]);

  const people = new Map(users.map((item) => [item.id, item]));
  const names = new Map(companies.map((item) => [item.id, item.name]));
  const own = companies.find((item) => item.id === user.companyId);
  const canSend = isStaff || Boolean(own);

  function label(endpoint: string) {
    if (endpoint.startsWith("u:")) return endpoint.slice(2);
    if (endpoint.startsWith("c:")) return names.get(endpoint.slice(2)) || "Paydaş";
    return "Yazışma";
  }

  const contacts = [
    ...companies
      .filter((item) => item.id !== user.companyId)
      .map((item) => ({
        id: companyEndpoint(item.id),
        name: item.name,
        kind: "paydas" as const,
        hint: accountKind(item.kind).label,
      })),
    ...MINISTRY_UNITS.map((unit) => ({
      id: unitEndpoint(unit),
      name: unit,
      kind: "birim" as const,
      hint: "Sağlık Bakanlığı birimi",
    })),
  ];

  const conversations = [];

  for (const thread of dmThreads) {
    const pair = parsePair(thread.title);
    if (!pair) continue;
    if (isStaff && !pair.some((part) => part.startsWith("u:"))) continue;
    if (!isStaff && mine && !pair.includes(mine)) continue;
    const units = pair.filter((part) => part.startsWith("u:"));
    const bothUnits = units.length === 2;
    const asUnit = units[0]?.slice(2) || "";
    const peerId = isStaff ? pair.find((part) => part !== (asUnit ? unitEndpoint(asUnit) : "")) || pair[1] : pair.find((part) => part !== mine) || "";
    const messages = thread.messages.map((message) => {
      const author = people.get(message.authorId);
      return {
        id: message.id,
        body: message.body,
        createdAt: message.createdAt,
        authorName: author?.name || "Kullanıcı",
        mine: mineMessage(author, user, bothUnits),
      };
    });
    const last = messages[messages.length - 1];
    conversations.push({
      threadId: thread.id,
      peerId,
      asUnit,
      channel: "dm",
      title: isStaff ? `${label(pair[0])} · ${label(pair[1])}` : label(peerId),
      subtitle: peerId.startsWith("u:") ? "Sağlık Bakanlığı birimi" : "Paydaş",
      lastBody: last?.body || "",
      lastAt: last?.createdAt || null,
      needsReply: Boolean(last && !last.mine),
      messages,
    });
  }

  for (const thread of legacy) {
    const companyName = names.get(thread.companyId || "") || thread.title;
    const messages = thread.messages.map((message) => {
      const author = people.get(message.authorId);
      const fromStaff = author ? staff(author.role) : false;
      return {
        id: message.id,
        body: message.body,
        createdAt: message.createdAt,
        authorName: author?.name || "Kullanıcı",
        mine: isStaff ? fromStaff : !fromStaff,
      };
    });
    const last = messages[messages.length - 1];
    conversations.push({
      threadId: thread.id,
      peerId: thread.companyId ? companyEndpoint(thread.companyId) : "",
      asUnit: "",
      channel: thread.type,
      title: isStaff ? companyName : thread.type === "qa" ? thread.title : "T.C. Sağlık Bakanlığı",
      subtitle: thread.type === "qa" ? thread.title : "Önceki yazışma",
      lastBody: last?.body || "",
      lastAt: last?.createdAt || null,
      needsReply: Boolean(last && !last.mine),
      messages,
    });
  }

  conversations.sort((a, b) => {
    const at = a.lastAt ? +new Date(a.lastAt) : 0;
    const bt = b.lastAt ? +new Date(b.lastAt) : 0;
    return bt - at;
  });

  return jsonOk({
    me: { id: user.id, role: user.role, name: user.name },
    canSend,
    units: isStaff ? [...MINISTRY_UNITS] : [],
    contacts: canSend ? contacts : [],
    conversations,
  });
}

export async function POST(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const body = await req.json().catch(() => ({}));
  const text = textOf(body.body);
  if (text.length < 1) return jsonError("Mesaj yazın");
  const isStaff = staff(user.role);

  if (body.threadId) {
    const thread = await prisma.thread.findUnique({ where: { id: String(body.threadId) } });
    if (!thread || !["dm", "inbox", "qa"].includes(thread.type)) return jsonError("Yazışma yok", 404);
    if (thread.type === "qa" && thread.status === "Kapalı") return jsonError("Bu yazışma kapatıldı");
    if (!isStaff) {
      if (thread.type === "dm") {
        const pair = parsePair(thread.title);
        if (!user.companyId || !pair?.includes(companyEndpoint(user.companyId))) return jsonError("Yetkiniz yok", 403);
      } else if (thread.companyId !== user.companyId) {
        return jsonError("Yetkiniz yok", 403);
      }
    } else if (thread.type === "dm" && !parsePair(thread.title)?.some((part) => part.startsWith("u:"))) {
      return jsonError("Yetkiniz yok", 403);
    }
    await prisma.chatMessage.create({ data: { threadId: thread.id, authorId: user.id, body: text } });
    await prisma.thread.update({ where: { id: thread.id }, data: { updatedAt: new Date() } });
    broadcast({ type: "message", payload: { threadId: thread.id } });
    return jsonOk({ ok: true }, 201);
  }

  const peerId = String(body.peerId || "");
  let self = "";
  if (isStaff) {
    const unit = String(body.asUnit || "");
    if (!MINISTRY_UNITS.includes(unit)) return jsonError("Hangi Bakanlık birimi olarak yazdığınızı seçin");
    self = unitEndpoint(unit);
  } else {
    if (!user.companyId) return jsonError("Hesabınıza bağlı paydaş kaydı yok");
    const company = await prisma.company.findUnique({ where: { id: user.companyId }, select: { status: true } });
    if (!company || company.status !== "Onaylandı") return jsonError("Mesaj için paydaş kaydının onaylı olması gerekir", 403);
    self = companyEndpoint(user.companyId);
  }
  if (!peerId || peerId === self) return jsonError("Kime yazacağınızı seçin");

  if (peerId.startsWith("c:")) {
    const company = await prisma.company.findUnique({ where: { id: peerId.slice(2) }, select: { id: true, status: true, name: true } });
    if (!company || company.status !== "Onaylandı") return jsonError("Bu paydaş onaylı değil", 404);
  } else if (!isUnit(peerId)) {
    return jsonError("Alıcı bulunamadı", 404);
  }

  const title = pairTitle(self, peerId);
  let thread = await prisma.thread.findFirst({ where: { type: "dm", title } });
  if (!thread) {
    thread = await prisma.thread.create({
      data: { type: "dm", title, createdById: user.id, companyId: peerId.startsWith("c:") ? peerId.slice(2) : user.companyId },
    });
  }
  await prisma.chatMessage.create({ data: { threadId: thread.id, authorId: user.id, body: text } });
  await prisma.thread.update({ where: { id: thread.id }, data: { updatedAt: new Date() } });
  broadcast({ type: "message", payload: { threadId: thread.id } });
  return jsonOk({ ok: true, threadId: thread.id }, 201);
}

function canDelete(user: SessionUser, thread: { type: string; title: string; companyId: string | null }) {
  if (!["dm", "inbox", "qa"].includes(thread.type)) return false;
  const isStaff = staff(user.role);
  if (!isStaff) {
    if (thread.type === "dm") {
      const pair = parsePair(thread.title);
      return Boolean(user.companyId && pair?.includes(companyEndpoint(user.companyId)));
    }
    return thread.companyId === user.companyId;
  }
  if (thread.type === "dm") return Boolean(parsePair(thread.title)?.some((part) => part.startsWith("u:")));
  return true;
}

export async function DELETE(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!id) return jsonError("Yazışma yok", 404);
  const thread = await prisma.thread.findUnique({ where: { id } });
  if (!thread || !canDelete(user, thread)) return jsonError(thread ? "Yetkiniz yok" : "Yazışma yok", thread ? 403 : 404);
  await prisma.chatMessage.deleteMany({ where: { threadId: thread.id } });
  await prisma.thread.delete({ where: { id: thread.id } });
  broadcast({ type: "message", payload: { threadId: thread.id } });
  return jsonOk({ ok: true });
}
