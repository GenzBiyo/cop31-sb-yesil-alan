import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";

export const dynamic = "force-dynamic";

async function staff() {
  const { user, error } = await withUser();
  if (error || !user) return { user: null, error };
  if (!canManage(user.role)) return { user: null, error: jsonError("Yetki yok", 403) };
  return { user, error: null };
}

function cleanCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 32);
}

export async function POST(req: Request) {
  const { error } = await staff();
  if (error) return error;
  const body = await req.json().catch(() => ({}));
  const code = cleanCode(String(body.code || ""));
  const title = String(body.title || "").trim().slice(0, 80);
  const message = String(body.message || "").trim().slice(0, 600);
  const location = String(body.location || "").trim().slice(0, 120);
  if (code.length < 3) return jsonError("Kod en az 3 karakter, harf ve rakam");
  if (!title || !message) return jsonError("Başlık ve mesaj gerekli");
  const taken = await prisma.pavilionTag.findUnique({ where: { code } });
  if (taken) return jsonError("Bu kod kullanılıyor");
  const tag = await prisma.pavilionTag.create({ data: { code, title, message, location } });
  return jsonOk(tag, 201);
}

export async function PATCH(req: Request) {
  const { error } = await staff();
  if (error) return error;
  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  const tag = await prisma.pavilionTag.findUnique({ where: { id } });
  if (!tag) return jsonError("Etiket yok", 404);
  const data: { title?: string; message?: string; location?: string; active?: boolean } = {};
  if (body.title != null) data.title = String(body.title).trim().slice(0, 80);
  if (body.message != null) data.message = String(body.message).trim().slice(0, 600);
  if (body.location != null) data.location = String(body.location).trim().slice(0, 120);
  if (body.active != null) data.active = Boolean(body.active);
  const saved = await prisma.pavilionTag.update({ where: { id }, data });
  return jsonOk(saved);
}

export async function DELETE(req: Request) {
  const { error } = await staff();
  if (error) return error;
  const id = new URL(req.url).searchParams.get("id") || "";
  await prisma.pavilionTag.delete({ where: { id } }).catch(() => null);
  return jsonOk({ ok: true });
}
