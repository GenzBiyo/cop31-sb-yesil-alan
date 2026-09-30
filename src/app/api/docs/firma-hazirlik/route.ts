import { mkdir, writeFile } from "fs/promises";
import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";

const FILE = "firma-hazirlik.pdf";

function filePath() {
  return path.join(process.cwd(), "public", "uploads", "docs", FILE);
}

export async function GET() {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  return jsonOk({ uploaded: fs.existsSync(filePath()) });
}

export async function POST(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return jsonError("PDF gerekli");
  const name = file.name.toLowerCase();
  if (file.type && file.type !== "application/pdf" && !name.endsWith(".pdf")) return jsonError("Yalnızca PDF yükleyin");
  if (file.size > 20 * 1024 * 1024) return jsonError("Dosya 20 MB sınırını aşıyor");
  const dir = path.join(process.cwd(), "public", "uploads", "docs");
  await mkdir(dir, { recursive: true });
  await writeFile(filePath(), Buffer.from(await file.arrayBuffer()));
  await prisma.setting.upsert({
    where: { key: "firmaPrepDoc" },
    update: { value: FILE },
    create: { key: "firmaPrepDoc", value: FILE },
  });
  return jsonOk({ uploaded: true });
}
