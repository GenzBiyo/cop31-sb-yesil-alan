import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { broadcast } from "@/lib/realtime";
import { addNote } from "@/lib/visitor-app";
import { MEETING_PENDING, MEETING_REJECTED, slotStates } from "@/lib/meeting-slots";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const { id } = await ctx.params;
  const slot = await prisma.meetingSlot.findUnique({ where: { id } });
  if (!slot) return jsonError("Kayıt yok", 404);
  if (!canManage(user.role) && !(user.role === "FIRMA" && user.companyId === slot.companyId)) return jsonError("Yetkiniz yok", 403);
  if ((await slotStates([id])).get(id)?.state === "dolu") {
    return jsonError("Onaylı görüşmesi olan saat silinemez. Önce görüşmeyi iptal edin.");
  }
  const pending = await prisma.meetingRequest.findMany({ where: { slotId: id, status: MEETING_PENDING } });
  for (const m of pending) {
    await prisma.meetingRequest.update({
      where: { id: m.id },
      data: { status: MEETING_REJECTED, note: "Firma bu saati takviminden kaldırdı. Lütfen başka bir saat seçin." },
    });
    await addNote(m.fromDeviceId, "Görüşme saati kaldırıldı", `${m.withName}: ${m.topic} — başka bir saat seçin.`, "meeting", m.id);
  }
  await prisma.meetingSlot.delete({ where: { id } });
  broadcast({ type: "agenda" });
  broadcast({ type: "app" });
  return jsonOk({ ok: true });
}
