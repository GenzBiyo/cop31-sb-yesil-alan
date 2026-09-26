import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api";
import { appState, deviceFromToken, validDeviceToken } from "@/lib/visitor-app";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const token = (req.headers.get("x-cop31-device") || "").trim();
  if (!validDeviceToken(token)) return jsonError("Cihaz kimliği gerekli");
  const device = await deviceFromToken(token);
  if (!device) return jsonError("Cihaz kimliği gerekli");
  const body = await req.json().catch(() => ({}));
  if (body.all) {
    await prisma.appNote.updateMany({ where: { deviceId: device.id, read: false }, data: { read: true } });
  } else if (body.id) {
    await prisma.appNote.updateMany({ where: { id: String(body.id), deviceId: device.id }, data: { read: true } });
  }
  return jsonOk(await appState(device.id));
}
