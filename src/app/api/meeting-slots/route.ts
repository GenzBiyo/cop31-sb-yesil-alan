import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage, type SessionUser } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { broadcast } from "@/lib/realtime";
import { buildSlots, overlaps, slotStates } from "@/lib/meeting-slots";

export const dynamic = "force-dynamic";

function companyOf(user: SessionUser, requested: string | null) {
  if (canManage(user.role)) return requested || "";
  if (user.role === "FIRMA") return user.companyId || "";
  return "";
}

export async function GET(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const companyId = companyOf(user, req.nextUrl.searchParams.get("companyId"));
  if (!companyId) return jsonError("Firma seçin", 400);
  const [slots, meetings] = await Promise.all([
    prisma.meetingSlot.findMany({ where: { companyId }, orderBy: [{ date: "asc" }, { startTime: "asc" }] }),
    prisma.meetingRequest.findMany({
      where: { withKind: "firma", withId: companyId },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { fromDevice: { select: { name: true, organization: true, email: true, phone: true } } },
    }),
  ]);
  const states = await slotStates(slots.map((s) => s.id));
  return jsonOk({
    slots: slots.map((s) => ({ ...s, state: states.get(s.id)?.state || "bos", pending: states.get(s.id)?.pending || 0 })),
    meetings: meetings.map((m) => ({
      id: m.id,
      kind: m.kind,
      topic: m.topic,
      message: m.message,
      status: m.status,
      slotId: m.slotId,
      preferredDate: m.preferredDate,
      preferredTime: m.preferredTime,
      whenDate: m.whenDate,
      startTime: m.startTime,
      endTime: m.endTime,
      location: m.location,
      note: m.note,
      fromName: m.fromDevice.name,
      fromOrganization: m.fromDevice.organization,
      fromEmail: m.fromDevice.email,
      fromPhone: m.fromDevice.phone,
      createdAt: m.createdAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const body = await req.json().catch(() => ({}));
  const companyId = companyOf(user, body.companyId ? String(body.companyId) : null);
  if (!companyId) return jsonError("Yetkiniz yok", 403);
  try {
    const wanted = buildSlots({
      dates: Array.isArray(body.dates) ? body.dates.map(String) : [],
      from: String(body.from || ""),
      to: String(body.to || ""),
      minutes: Number(body.minutes || 0),
      breakMinutes: Number(body.breakMinutes || 0),
    });
    const location = String(body.location || "").trim().slice(0, 140);
    const existing = await prisma.meetingSlot.findMany({
      where: { companyId, date: { in: [...new Set(wanted.map((w) => w.date))] } },
      select: { date: true, startTime: true, endTime: true },
    });
    const fresh = wanted.filter((w) => !existing.some((e) => e.date === w.date && overlaps(e, w)));
    if (fresh.length) {
      await prisma.meetingSlot.createMany({ data: fresh.map((w) => ({ ...w, companyId, location })) });
    }
    broadcast({ type: "agenda" });
    return jsonOk({ created: fresh.length, skipped: wanted.length - fresh.length }, 201);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Slot oluşturulamadı");
  }
}

/** Clears every slot of one day that has no request on it. */
export async function DELETE(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const companyId = companyOf(user, req.nextUrl.searchParams.get("companyId"));
  const date = req.nextUrl.searchParams.get("date") || "";
  if (!companyId) return jsonError("Yetkiniz yok", 403);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return jsonError("Gün seçin");
  const slots = await prisma.meetingSlot.findMany({ where: { companyId, date }, select: { id: true } });
  const states = await slotStates(slots.map((s) => s.id));
  const free = slots.filter((s) => !states.has(s.id)).map((s) => s.id);
  if (free.length) await prisma.meetingSlot.deleteMany({ where: { id: { in: free } } });
  broadcast({ type: "agenda" });
  return jsonOk({ deleted: free.length, kept: slots.length - free.length });
}
