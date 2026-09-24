import { NextRequest } from "next/server";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { notifyAgenda, type Audience } from "@/lib/agenda";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const { id } = await ctx.params;
  const body = await req.json();
  const audience = (body.audience || "hepsi") as Audience;
  const title = String(body.title || "COP31 mesajı").slice(0, 180);
  const text = String(body.body || "").trim();
  if (!text) return jsonError("Mesaj boş olamaz");
  const result = await notifyAgenda(id, {
    kind: "broadcast",
    audience: ["katilimci", "konusmaci", "hepsi"].includes(audience) ? audience : "hepsi",
    title,
    body: text,
  });
  return jsonOk(result);
}
