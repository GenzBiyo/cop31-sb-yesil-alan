import { jsonError, jsonOk } from "@/lib/api";
import { appState, deviceFromToken, validDeviceToken } from "@/lib/visitor-app";
import { claimJoinWheel, wheelWho } from "@/lib/once-wheel";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const token = (req.headers.get("x-cop31-device") || "").trim();
  if (!validDeviceToken(token)) return jsonError("Cihaz kimliği gerekli");
  const device = await deviceFromToken(token);
  if (!device?.name || !device.email) return jsonError("Önce kayıt olun", 401);
  const body = await req.json().catch(() => ({}));
  const refId = String(body.agendaId || body.refId || "");
  const who = wheelWho(device.email, device.id);
  const joined = await prisma.appJoin.findFirst({ where: { deviceId: device.id, refId } });
  if (!joined) return jsonError("Önce etkinliğe katılın", 403);
  try {
    const wheel = await claimJoinWheel(refId, who, device.name);
    return jsonOk({ ...wheel, state: await appState(device.id) });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Çark açılamadı");
  }
}
