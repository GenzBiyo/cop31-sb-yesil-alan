import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { broadcast } from "@/lib/realtime";
import { notifyScheduleChange } from "@/lib/agenda";
import { memoClear } from "@/lib/memo";

const ALLOWED = [
  "startTime",
  "endTime",
  "title",
  "description",
  "location",
  "type",
  "panelId",
  "companyId",
  "status",
  "sortOrder",
  "dayId",
] as const;

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const { id } = await ctx.params;
  const body = await req.json();
  const before = await prisma.agendaItem.findUnique({ where: { id }, include: { day: true } });
  if (!before) return jsonError("Oturum yok", 404);

  const data: Record<string, unknown> = {};
  for (const key of ALLOWED) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  const item = await prisma.agendaItem.update({ where: { id }, data });
  await notifyScheduleChange(
    {
      title: before.title,
      startTime: before.startTime,
      endTime: before.endTime,
      location: before.location,
      date: before.day.date,
    },
    id
  );
  memoClear("public-program");
  broadcast({ type: "agenda" });
  return jsonOk(item);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const { id } = await ctx.params;
  await prisma.agendaItem.delete({ where: { id } });
  memoClear("public-program");
  broadcast({ type: "agenda" });
  return jsonOk({ ok: true });
}
