import { NextRequest } from "next/server";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { canManage } from "@/lib/auth";
import { DeskError, actAdmin, loadAdminDesk } from "@/lib/elci-desk";

export async function GET(req: NextRequest) {
  const { user, error } = await withUser();
  if (!user) return error;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const grup = req.nextUrl.searchParams.get("grup") || "";
  const kisi = req.nextUrl.searchParams.get("kisi") || "";
  try {
    return jsonOk(await loadAdminDesk({ grup, kisi }));
  } catch (err) {
    if (err instanceof DeskError) return jsonError(err.message, err.status);
    throw err;
  }
}

export async function POST(req: NextRequest) {
  const { user, error } = await withUser();
  if (!user) return error;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const body = await req.json().catch(() => ({}));
  try {
    return jsonOk(await actAdmin(body));
  } catch (err) {
    if (err instanceof DeskError) return jsonError(err.message, err.status);
    throw err;
  }
}
