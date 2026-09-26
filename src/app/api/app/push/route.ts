import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api";
import { appState, deviceFromToken, validDeviceToken } from "@/lib/visitor-app";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const token = (req.headers.get("x-cop31-device") || "").trim();
  if (!validDeviceToken(token)) return jsonError("Cihaz kimliği gerekli");
  const device = await deviceFromToken(token);
  if (!device) return jsonError("Cihaz kimliği gerekli");
  const body = await req.json().catch(() => ({}));
  const subscription = body.subscription;
  if (!subscription?.endpoint) return jsonError("Bildirim aboneliği eksik");
  await prisma.appDevice.update({
    where: { id: device.id },
    data: { pushJson: JSON.stringify(subscription) },
  });
  return jsonOk(await appState(device.id));
}
