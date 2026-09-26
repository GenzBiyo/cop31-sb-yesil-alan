import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { updateMeeting } from "@/lib/visitor-app";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const { user, error } = await withUser();
  if (error || !user) return error;
  if (!canManage(user.role)) return jsonError("Yetki yok", 403);
  const body = await req.json().catch(() => ({}));
  try {
    await updateMeeting("staff", String(body.id || ""), {
      status: body.status ? String(body.status) : undefined,
      whenDate: body.whenDate != null ? String(body.whenDate) : undefined,
      startTime: body.startTime != null ? String(body.startTime) : undefined,
      endTime: body.endTime != null ? String(body.endTime) : undefined,
      location: body.location != null ? String(body.location) : undefined,
      note: body.note != null ? String(body.note) : undefined,
    });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Görüşme güncellenemedi");
  }
  return jsonOk({ ok: true });
}
