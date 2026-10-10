import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { broadcast } from "@/lib/realtime";
import { notifyScheduleChange } from "@/lib/agenda";
import { memoClear } from "@/lib/memo";
import { venueBookingError } from "@/lib/venue-booking";
import { canonicalVenue, sessionKind } from "@/lib/venues";

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
  if (data.location != null) data.location = canonicalVenue(String(data.location)) || String(data.location);
  const day = data.dayId && data.dayId !== before.dayId
    ? await prisma.thematicDay.findUnique({ where: { id: String(data.dayId) } })
    : before.day;
  if (!day) return jsonError("Gün seçin");
  const type = String(data.type ?? before.type);
  const kind = sessionKind(type);
  if (kind && ["startTime", "endTime", "location", "type", "dayId"].some((key) => data[key] !== undefined)) {
    const clash = await venueBookingError({
      location: String(data.location ?? before.location),
      date: day.date,
      startTime: String(data.startTime ?? before.startTime),
      endTime: String(data.endTime ?? before.endTime),
      kind,
      panelId: before.panelId || undefined,
      agendaId: id,
    });
    if (clash) return jsonError(clash);
  }
  const item = await prisma.agendaItem.update({ where: { id }, data });
  if (before.panelId && kind) {
    await prisma.panel.update({
      where: { id: before.panelId },
      data: {
        date: day.date,
        startTime: item.startTime,
        endTime: item.endTime,
        location: item.location,
      },
    });
  }
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
