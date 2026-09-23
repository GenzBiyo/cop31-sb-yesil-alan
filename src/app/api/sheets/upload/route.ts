import { NextRequest } from "next/server";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { loadWorkbookFromBuffer, mergeTodosFromWorkbook } from "@/lib/sheets";
import { broadcast } from "@/lib/realtime";

export async function POST(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return jsonError("Excel dosyası yükleyin");
  const buf = Buffer.from(await file.arrayBuffer());
  const wb = await loadWorkbookFromBuffer(buf);
  const result = await mergeTodosFromWorkbook(wb);
  broadcast({ type: "todo" });
  return jsonOk(result);
}
