import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { updateMeeting } from "@/lib/visitor-app";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** A firm's web account answers or reschedules a meeting request addressed to the firm. */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const { id } = await ctx.params;
  const meeting = await prisma.meetingRequest.findUnique({ where: { id } });
  if (!meeting) return jsonError("Talep yok", 404);
  const own = user.role === "FIRMA" && meeting.withKind === "firma" && meeting.withId === user.companyId;
  if (!own && !canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const body = await req.json().catch(() => ({}));
  const status = body.status === "Kabul" || body.status === "Red" ? body.status : undefined;
  if (status && meeting.status !== "Bekliyor" && !(status === "Red" && meeting.status === "Kabul")) {
    return jsonError("Bu talep zaten yanıtlandı");
  }
  try {
    await updateMeeting("staff", id, {
      status,
      location: body.location != null ? String(body.location) : undefined,
      note: body.note != null ? String(body.note) : undefined,
    });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Görüşme güncellenemedi");
  }
  return jsonOk({ ok: true });
}
