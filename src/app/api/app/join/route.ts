import { jsonError, jsonOk } from "@/lib/api";
import { appState, deviceFromToken, toggleJoin, validDeviceToken } from "@/lib/visitor-app";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const token = (req.headers.get("x-cop31-device") || "").trim();
  if (!validDeviceToken(token)) return jsonError("Cihaz kimliği gerekli");
  const device = await deviceFromToken(token);
  if (!device) return jsonError("Cihaz kimliği gerekli");
  const body = await req.json().catch(() => ({}));
  const kind = body.kind === "event" ? "event" : "agenda";
  try {
    const result = await toggleJoin(device.id, kind, String(body.refId || ""), Boolean(body.on));
    return jsonOk({ ...result, state: await appState(device.id) });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Katılım kaydedilemedi");
  }
}
