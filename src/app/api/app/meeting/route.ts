import { jsonError, jsonOk } from "@/lib/api";
import { appState, createMeeting, deviceFromToken, updateMeeting, validDeviceToken } from "@/lib/visitor-app";

export const dynamic = "force-dynamic";

async function actor(req: Request) {
  const token = (req.headers.get("x-cop31-device") || "").trim();
  if (!validDeviceToken(token)) return { device: null, error: jsonError("Cihaz kimliği gerekli") };
  const device = await deviceFromToken(token);
  if (!device) return { device: null, error: jsonError("Cihaz kimliği gerekli") };
  return { device, error: null };
}

export async function POST(req: Request) {
  const { device, error } = await actor(req);
  if (error || !device) return error;
  const body = await req.json().catch(() => ({}));
  try {
    await createMeeting(device.id, {
      kind: String(body.kind || ""),
      withKind: String(body.withKind || ""),
      withId: String(body.withId || ""),
      topic: String(body.topic || ""),
      message: String(body.message || ""),
      preferredDate: String(body.preferredDate || ""),
      preferredTime: String(body.preferredTime || ""),
    });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Talep iletilemedi");
  }
  return jsonOk(await appState(device.id), 201);
}

export async function PATCH(req: Request) {
  const { device, error } = await actor(req);
  if (error || !device) return error;
  const body = await req.json().catch(() => ({}));
  try {
    await updateMeeting(device.id, String(body.id || ""), {
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
  return jsonOk(await appState(device.id));
}
