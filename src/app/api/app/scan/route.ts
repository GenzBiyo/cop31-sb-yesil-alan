import { jsonError, jsonOk } from "@/lib/api";
import { appState, deviceFromToken, scanTag, validDeviceToken } from "@/lib/visitor-app";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const token = (req.headers.get("x-cop31-device") || "").trim();
  if (!validDeviceToken(token)) return jsonError("Cihaz kimliği gerekli");
  const device = await deviceFromToken(token);
  if (!device) return jsonError("Cihaz kimliği gerekli");
  const body = await req.json().catch(() => ({}));
  try {
    const result = await scanTag(device.id, String(body.code || ""));
    const state = await appState(device.id);
    return jsonOk({ ...result, state });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Etiket okunamadı");
  }
}
