import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { MAIN_LOGO_KEY, resolveMainLogo } from "@/lib/sponsors";

export const runtime = "nodejs";

const MAX_LOGO = 4 * 1024 * 1024;

async function saveLogo(file: File) {
  if (file.size > MAX_LOGO) throw new Error("Logo en fazla 4 MB olabilir");
  const type = file.type || "";
  if (!type.startsWith("image/") && !/\.(png|jpe?g|webp|svg)$/i.test(file.name)) {
    throw new Error("PNG, JPG, WebP veya SVG yükleyin");
  }
  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  const dir = path.join(process.cwd(), "public", "uploads", "sponsors");
  await mkdir(dir, { recursive: true });
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
  return `/uploads/sponsors/${filename}`;
}

export async function GET() {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!isAdmin(user.role)) return jsonError("Yetkiniz yok", 403);
  const [setting, rows] = await Promise.all([
    prisma.setting.findUnique({ where: { key: MAIN_LOGO_KEY } }),
    prisma.sponsor.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
  ]);
  return jsonOk({ mainLogo: resolveMainLogo(setting?.value), sponsors: rows });
}

export async function POST(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!isAdmin(user.role)) return jsonError("Yetkiniz yok", 403);
  const form = await req.formData();
  const name = String(form.get("name") || "").trim();
  if (!name) return jsonError("Sponsor adı gerekli");
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) return jsonError("Logo dosyası seçin");
  try {
    const logoPath = await saveLogo(file);
    const last = await prisma.sponsor.aggregate({ _max: { sortOrder: true } });
    const row = await prisma.sponsor.create({
      data: {
        name,
        logoPath,
        url: String(form.get("url") || "").trim(),
        sortOrder: (last._max.sortOrder || 0) + 1,
        active: String(form.get("active") || "1") !== "0",
      },
    });
    return jsonOk(row, 201);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Logo yüklenemedi");
  }
}
