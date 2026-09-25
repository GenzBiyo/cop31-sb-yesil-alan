import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { APPROVED, notifyCompanyDecision, PENDING, REJECTED } from "@/lib/proposals";
import { broadcast } from "@/lib/realtime";
import { isNormalType, isYouthType, slotByStart, validateEventSlot } from "@/lib/event-slots";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const { id } = await ctx.params;
  const existing = await prisma.pavilionEvent.findUnique({ where: { id } });
  if (!existing) return jsonError("Etkinlik yok", 404);
  const body = await req.json();

  if (body.review) {
    if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
    const decision = String(body.review);
    const ok = decision === APPROVED || decision === "approve";
    const no = decision === REJECTED || decision === "reject";
    if (!ok && !no) return jsonError("Geçersiz karar");
    const event = await prisma.pavilionEvent.update({
      where: { id },
      data: {
        approvalStatus: ok ? APPROVED : REJECTED,
        published: ok,
      },
    });
    await notifyCompanyDecision({
      proposedById: existing.proposedById,
      companyId: existing.companyId,
      title: ok ? "Etkinlik öneriniz onaylandı" : "Etkinlik öneriniz reddedildi",
      body: `${existing.title} · ${existing.date} ${existing.startTime}–${existing.endTime}${body.message ? `\n\n${body.message}` : ""}`,
    });
    broadcast({ type: "agenda" });
    return jsonOk(event);
  }

  const ownPending =
    user.role === "FIRMA" && existing.companyId === user.companyId && existing.approvalStatus === PENDING;
  if (!canManage(user.role) && !ownPending) return jsonError("Yetkiniz yok", 403);

  const data: Record<string, unknown> = {};
  for (const key of ["title", "type", "companyName", "topic", "date", "startTime", "endTime", "location", "description", "gift"]) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  if (body.startTime != null) {
    const slot = slotByStart(String(body.startTime));
    if (slot) {
      data.startTime = slot.start;
      data.endTime = slot.end;
    }
  }
  const slotTouched = body.startTime != null || body.endTime != null || body.date != null;
  if (slotTouched) {
    const nextDate = String(data.date ?? existing.date);
    const nextStart = String(data.startTime ?? existing.startTime);
    const nextEnd = String(data.endTime ?? existing.endTime);
    const nextType = String(data.type ?? existing.type);
    const occupied = await prisma.pavilionEvent.findMany({
      select: { id: true, date: true, startTime: true, endTime: true, approvalStatus: true },
    });
    const slotError = validateEventSlot({
      date: nextDate,
      startTime: nextStart,
      endTime: nextEnd,
      type: nextType,
      occupied,
      ignoreId: id,
    });
    if (slotError) return jsonError(slotError);
  } else if (body.type != null) {
    const youthHour = String(existing.startTime) >= "17:00";
    const nextType = String(body.type);
    if (youthHour && !isYouthType(nextType)) {
      return jsonError("17:00’den sonra Gençlik saati: yalnızca gençlik oyunları seçilebilir.");
    }
    if (!youthHour && !isNormalType(nextType)) {
      return jsonError("Bu saatte yalnızca normal etkinlikler seçilebilir. Gençlik oyunları 17:00’den sonra.");
    }
  }
  if (body.published !== undefined && canManage(user.role)) data.published = Boolean(body.published);
  if (body.config !== undefined) data.config = typeof body.config === "string" ? body.config : JSON.stringify(body.config);
  const event = await prisma.pavilionEvent.update({ where: { id }, data });
  return jsonOk(event);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const { id } = await ctx.params;
  const existing = await prisma.pavilionEvent.findUnique({ where: { id } });
  if (!existing) return jsonError("Etkinlik yok", 404);
  const ownPending =
    user.role === "FIRMA" && existing.companyId === user.companyId && existing.approvalStatus === PENDING;
  if (!canManage(user.role) && !ownPending) return jsonError("Yetkiniz yok", 403);
  await prisma.pavilionEvent.delete({ where: { id } });
  broadcast({ type: "agenda" });
  return jsonOk({ ok: true });
}
