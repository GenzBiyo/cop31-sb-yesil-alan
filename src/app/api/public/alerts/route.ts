import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api";
import { tickAgendaReminders, validEmail } from "@/lib/agenda";

export async function GET(req: NextRequest) {
  await tickAgendaReminders();
  const email = String(req.nextUrl.searchParams.get("email") || "")
    .trim()
    .toLowerCase();
  if (!validEmail(email)) return jsonOk([]);
  const items = await prisma.agendaNotice.findMany({
    where: { email, seen: false },
    orderBy: { createdAt: "desc" },
    take: 8,
  });
  return jsonOk(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = String(body.email || "").trim().toLowerCase();
  if (!validEmail(email)) return jsonError("E-posta gerekli");
  if (body.all) {
    await prisma.agendaNotice.updateMany({ where: { email }, data: { seen: true } });
    return jsonOk({ ok: true });
  }
  if (!body.id) return jsonError("id gerekli");
  const item = await prisma.agendaNotice.update({
    where: { id: body.id },
    data: { seen: true },
  });
  return jsonOk(item);
}
