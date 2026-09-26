import { NextResponse } from "next/server";
import { jsonError, jsonOk } from "@/lib/api";
import { appState, deviceFromToken, saveProfile, validDeviceToken } from "@/lib/visitor-app";

export const dynamic = "force-dynamic";

const DEVICE_COOKIE = "cop31_device";

function tokenOf(req: Request) {
  const header = (req.headers.get("x-cop31-device") || "").trim();
  if (validDeviceToken(header)) return header;
  const raw = req.headers.get("cookie") || "";
  const match = raw.match(/(?:^|;\s*)cop31_device=([^;]+)/);
  return match ? decodeURIComponent(match[1]).trim() : "";
}

function rememberDevice(res: NextResponse, req: Request, token: string) {
  const proto = req.headers.get("x-forwarded-proto") || new URL(req.url).protocol.replace(":", "");
  res.cookies.set(DEVICE_COOKIE, token, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
    secure: proto === "https",
  });
  return res;
}

export async function GET(req: Request) {
  const token = tokenOf(req);
  if (!validDeviceToken(token)) return jsonError("Cihaz kimliği gerekli");
  const device = await deviceFromToken(token);
  if (!device) return jsonError("Cihaz kimliği gerekli");
  const state = await appState(device.id);
  return rememberDevice(await jsonOk(state), req, token);
}

export async function POST(req: Request) {
  const token = tokenOf(req);
  if (!validDeviceToken(token)) return jsonError("Cihaz kimliği gerekli");
  const device = await deviceFromToken(token);
  if (!device) return jsonError("Cihaz kimliği gerekli");
  const body = await req.json().catch(() => ({}));
  try {
    await saveProfile(device.id, {
      name: String(body.name || ""),
      email: String(body.email || ""),
      phone: String(body.phone || ""),
      organization: String(body.organization || ""),
      role: String(body.role || ""),
      companyId: String(body.companyId || ""),
      personId: String(body.personId || ""),
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Profil kaydedilemedi");
  }
  return rememberDevice(await jsonOk(await appState(device.id)), req, token);
}
