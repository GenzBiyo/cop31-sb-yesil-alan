import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";

export const runtime = "nodejs";

const MAX_LOGO = 4 * 1024 * 1024;

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!isAdmin(user.role)) return jsonError("Yetkiniz yok", 403);
  const { id } = await ctx.params;
  const existing = await prisma.sponsor.findUnique({ where: { id } });
  if (!existing) return jsonError("Sponsor yok", 404);
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) return jsonError("Logo dosyası seçin");
  if (file.size > MAX_LOGO) return jsonError("Logo en fazla 4 MB olabilir");
  const type = file.type || "";
  if (!type.startsWith("image/") && !/\.(png|jpe?g|webp|svg)$/i.test(file.name)) {
    return jsonError("PNG, JPG, WebP veya SVG yükleyin");
  }
  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  const dir = path.join(process.cwd(), "public", "uploads", "sponsors");
  await mkdir(dir, { recursive: true });
  const filename = `${id}-${Date.now()}.${ext}`;
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
  const logoPath = `/uploads/sponsors/${filename}`;
  const row = await prisma.sponsor.update({ where: { id }, data: { logoPath } });
  return jsonOk(row);
}
