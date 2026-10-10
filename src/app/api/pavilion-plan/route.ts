import { mkdir, unlink, writeFile } from "fs/promises";
import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { pavilionPlanDir, pavilionPlanSrc } from "@/lib/pavilion-plan";

const TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export async function GET() {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  return jsonOk({ src: pavilionPlanSrc() });
}

export async function POST(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return jsonError("Görsel gerekli");
  const ext = TYPES[file.type] || (file.name.toLowerCase().endsWith(".png") ? ".png" : file.name.toLowerCase().endsWith(".webp") ? ".webp" : file.name.toLowerCase().match(/\.jpe?g$/) ? ".jpg" : "");
  if (!ext) return jsonError("Yalnızca JPG, PNG veya WEBP yükleyin");
  if (file.size > 12 * 1024 * 1024) return jsonError("Dosya 12 MB sınırını aşıyor");
  const dir = pavilionPlanDir();
  await mkdir(dir, { recursive: true });
  for (const name of ["plan.png", "plan.jpg", "plan.jpeg", "plan.webp"]) {
    const old = path.join(dir, name);
    if (fs.existsSync(old)) await unlink(old);
  }
  await writeFile(path.join(dir, `plan${ext}`), Buffer.from(await file.arrayBuffer()));
  return jsonOk({ src: pavilionPlanSrc() });
}
