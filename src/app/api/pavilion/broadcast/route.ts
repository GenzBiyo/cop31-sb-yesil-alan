import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { notifyDevices } from "@/lib/visitor-app";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { user, error } = await withUser();
  if (error || !user) return error;
  if (!canManage(user.role)) return jsonError("Yetki yok", 403);
  const body = await req.json().catch(() => ({}));
  const title = String(body.title || "").trim().slice(0, 80);
  const text = String(body.body || "").trim().slice(0, 600);
  if (!title || !text) return jsonError("Başlık ve metin gerekli");
  const sent = await notifyDevices("all", title, text, "broadcast");
  return jsonOk({ sent });
}
