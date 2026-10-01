import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";

export const runtime = "nodejs";

const MAX_LOGO = 4 * 1024 * 1024;

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const { id } = await ctx.params;
  if (!canManage(user.role) && user.companyId !== id) return jsonError("Yetkiniz yok", 403);
  const existing = await prisma.company.findUnique({ where: { id } });
  if (!existing) return jsonError("Firma bulunamadı", 404);
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) return jsonError("Logo dosyası seçin");
  if (file.size > MAX_LOGO) return jsonError("Logo en fazla 4 MB olabilir");
  if (!/\.(png|jpe?g|webp|svg)$/i.test(file.name) && !/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) {
    return jsonError("PNG, JPG, WebP veya SVG yükleyin");
  }
  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  const dir = path.join(process.cwd(), "public", "uploads", "companies");
  await mkdir(dir, { recursive: true });
  const filename = `${id}-${Date.now()}.${ext}`;
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
  const row = await prisma.company.update({ where: { id }, data: { logoPath: `/uploads/companies/${filename}` } });
  return jsonOk({ logoPath: row.logoPath });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const { id } = await ctx.params;
  if (!canManage(user.role) && user.companyId !== id) return jsonError("Yetkiniz yok", 403);
  await prisma.company.update({ where: { id }, data: { logoPath: "" } });
  return jsonOk({ ok: true });
}
