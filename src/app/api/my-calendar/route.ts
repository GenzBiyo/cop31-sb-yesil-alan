import { NextRequest } from "next/server";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { companyCalendar } from "@/lib/my-calendar";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const companyId = canManage(user.role) ? req.nextUrl.searchParams.get("companyId") || "" : user.role === "FIRMA" ? user.companyId || "" : "";
  if (!companyId) return jsonError("Firma seçin", 400);
  try {
    return jsonOk(await companyCalendar(companyId));
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Takvim alınamadı", 404);
  }
}
