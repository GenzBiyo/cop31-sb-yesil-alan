import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest } from "next/server";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { creditError, readEventCredits, writeEventCredits, type EventCredit } from "@/lib/event-credits";

export const runtime = "nodejs";

const MAX_LOGO = 4 * 1024 * 1024;

async function saveLogo(file: File) {
  if (file.size > MAX_LOGO) throw new Error("Logo en fazla 4 MB olabilir");
  const type = file.type || "";
  if (!type.startsWith("image/") && !/\.(png|jpe?g|webp|svg)$/i.test(file.name)) throw new Error("PNG, JPG, WebP veya SVG yükleyin");
  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  const dir = path.join(process.cwd(), "public", "uploads", "sponsors");
  await mkdir(dir, { recursive: true });
  const filename = `credit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
  return `/uploads/sponsors/${filename}`;
}

export async function GET() {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  return jsonOk({ credits: await readEventCredits() });
}

export async function POST(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) return jsonError("Logo dosyası seçin");
  const row: EventCredit = {
    id: crypto.randomUUID(),
    name: String(form.get("name") || "").trim().slice(0, 80),
    before: String(form.get("before") || "").trim().slice(0, 120),
    after: String(form.get("after") || "").trim().slice(0, 120),
    logoPath: "",
    from: String(form.get("from") || "").trim(),
    to: String(form.get("to") || "").trim(),
  };
  const problem = creditError(row);
  if (problem) return jsonError(problem);
  const credits = await readEventCredits();
  if (credits.length >= 12) return jsonError("En fazla 12 sponsor satırı eklenebilir");
  try {
    row.logoPath = await saveLogo(file);
    credits.push(row);
    await writeEventCredits(credits);
    return jsonOk(row, 201);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Kaydedilemedi");
  }
}
