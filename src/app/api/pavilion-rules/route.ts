import { NextRequest } from "next/server";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { readPavilionRules, savePavilionRules } from "@/lib/pavilion-rules";

export async function GET() {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const body = await readPavilionRules();
  return jsonOk({ body, canEdit: canManage(user.role) });
}

export async function PUT(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const payload = await req.json().catch(() => ({}));
  try {
    const body = await savePavilionRules(String(payload.body || ""));
    return jsonOk({ body });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Kaydedilemedi");
  }
}
