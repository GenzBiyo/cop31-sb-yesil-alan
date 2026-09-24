import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { broadcast } from "@/lib/realtime";
import { ensureEvents } from "@/lib/events-db";
import { ensureAgendaSlots, tickAgendaReminders } from "@/lib/agenda";

export async function GET() {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  await ensureEvents();
  await ensureAgendaSlots();
  await tickAgendaReminders();
  const days = await prisma.thematicDay.findMany({
    include: {
      agenda: {
        orderBy: [{ startTime: "asc" }, { sortOrder: "asc" }],
        include: { _count: { select: { signups: true } } },
      },
    },
    orderBy: { date: "asc" },
  });
  return jsonOk(days);
}

export async function PATCH(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const body = await req.json();
  if (!body.id) return jsonError("id gerekli");
  const day = await prisma.thematicDay.update({
    where: { id: body.id },
    data: {
      themeTr: body.themeTr,
      themeEn: body.themeEn,
      topic1: body.topic1,
      topic2: body.topic2,
      notes: body.notes,
    },
  });
  broadcast({ type: "agenda" });
  return jsonOk(day);
}
