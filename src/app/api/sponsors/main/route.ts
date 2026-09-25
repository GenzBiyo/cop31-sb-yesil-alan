import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { MAIN_LOGO_KEY, resolveMainLogo } from "@/lib/sponsors";

export const runtime = "nodejs";

const MAX_LOGO = 4 * 1024 * 1024;

export async function GET() {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!isAdmin(user.role)) return jsonError("Yetkiniz yok", 403);
  const setting = await prisma.setting.findUnique({ where: { key: MAIN_LOGO_KEY } });
  return jsonOk({ mainLogo: resolveMainLogo(setting?.value) });
}

export async function POST(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!isAdmin(user.role)) return jsonError("Yetkiniz yok", 403);
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
  const filename = `main-${Date.now()}.${ext}`;
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
  const logoPath = `/uploads/sponsors/${filename}`;
  await prisma.setting.upsert({
    where: { key: MAIN_LOGO_KEY },
    update: { value: logoPath },
    create: { key: MAIN_LOGO_KEY, value: logoPath },
  });
  return jsonOk({ mainLogo: logoPath });
}

export async function DELETE() {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!isAdmin(user.role)) return jsonError("Yetkiniz yok", 403);
  await prisma.setting.deleteMany({ where: { key: MAIN_LOGO_KEY } });
  return jsonOk({ mainLogo: resolveMainLogo("") });
}
