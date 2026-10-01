import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { broadcast } from "@/lib/realtime";
import { MEETING_PENDING, MEETING_REJECTED, openSlotsByCompany } from "@/lib/meeting-slots";
import { createMeeting, webDevice } from "@/lib/visitor-app";
import { notifyCompanyDecision } from "@/lib/proposals";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (user.role !== "FIRMA" || !user.companyId) return jsonError("Yalnızca paydaş hesapları", 403);
  const [companies, slots, outgoing] = await Promise.all([
    prisma.company.findMany({
      where: { status: "Onaylandı", NOT: { id: user.companyId } },
      select: { id: true, name: true, kind: true, topic: true },
      orderBy: { name: "asc" },
    }),
    openSlotsByCompany(),
    prisma.meetingRequest.findMany({
      where: { fromDevice: { role: "firma", companyId: user.companyId } },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { fromDevice: { select: { name: true } } },
    }),
  ]);
  return jsonOk({
    directory: companies.map((c) => ({ ...c, slots: slots.get(c.id) || [] })),
    outgoing: outgoing.map((m) => ({
      id: m.id,
      kind: m.kind,
      withKind: m.withKind,
      withName: m.withName,
      topic: m.topic,
      message: m.message,
      status: m.status,
      preferredDate: m.preferredDate,
      preferredTime: m.preferredTime,
      whenDate: m.whenDate,
      startTime: m.startTime,
      endTime: m.endTime,
      location: m.location,
      note: m.note,
      fromName: m.fromDevice.name,
      createdAt: m.createdAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (user.role !== "FIRMA" || !user.companyId) return jsonError("Yalnızca paydaş hesapları", 403);
  const body = await req.json().catch(() => ({}));
  try {
    const full = await prisma.user.findUnique({ where: { id: user.id } });
    if (!full) return jsonError("Kullanıcı yok", 404);
    const device = await webDevice(full);
    const meeting = await createMeeting(device.id, {
      kind: String(body.kind || "ikili"),
      withKind: String(body.withKind || "firma"),
      withId: String(body.withId || ""),
      topic: String(body.topic || ""),
      message: String(body.message || ""),
      preferredDate: String(body.preferredDate || ""),
      preferredTime: String(body.preferredTime || ""),
      slotId: body.slotId ? String(body.slotId) : undefined,
    });
    broadcast({ type: "app" });
    broadcast({ type: "agenda" });
    return jsonOk({ meeting }, 201);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Talep gönderilemedi");
  }
}

/** Withdraws one of the account's own pending requests. */
export async function DELETE(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (user.role !== "FIRMA" || !user.companyId) return jsonError("Yalnızca paydaş hesapları", 403);
  const id = req.nextUrl.searchParams.get("id") || "";
  const meeting = await prisma.meetingRequest.findUnique({ where: { id }, include: { fromDevice: true } });
  if (!meeting || meeting.fromDevice.role !== "firma" || meeting.fromDevice.companyId !== user.companyId) {
    return jsonError("Talep bulunamadı", 404);
  }
  if (meeting.status !== MEETING_PENDING) return jsonError("Yalnızca bekleyen talep geri çekilir");
  await prisma.meetingRequest.update({
    where: { id },
    data: { status: MEETING_REJECTED, note: "Talep sahibi geri çekti." },
  });
  if (meeting.withKind === "firma" && meeting.withId) {
    await notifyCompanyDecision({
      companyId: meeting.withId,
      title: "Toplantı talebi geri çekildi",
      body: `${meeting.fromDevice.name}${meeting.fromDevice.organization ? ` (${meeting.fromDevice.organization})` : ""}: ${meeting.topic}`,
    });
  }
  broadcast({ type: "app" });
  broadcast({ type: "agenda" });
  return jsonOk({ ok: true });
}
