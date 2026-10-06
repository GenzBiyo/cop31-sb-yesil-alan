import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest } from "next/server";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { creditError, readEventCredits, writeEventCredits } from "@/lib/event-credits";

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

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const { id } = await ctx.params;
  const credits = await readEventCredits();
  const index = credits.findIndex((row) => row.id === id);
  if (index < 0) return jsonError("Sponsor satırı yok", 404);
  const form = await req.formData();
  const next = {
    ...credits[index],
    name: String(form.get("name") ?? credits[index].name).trim().slice(0, 80),
    before: String(form.get("before") ?? credits[index].before).trim().slice(0, 120),
    after: String(form.get("after") ?? credits[index].after).trim().slice(0, 120),
    from: String(form.get("from") ?? credits[index].from).trim(),
    to: String(form.get("to") ?? credits[index].to).trim(),
  };
  const problem = creditError(next);
  if (problem) return jsonError(problem);
  const file = form.get("file");
  try {
    if (file instanceof File && file.size) next.logoPath = await saveLogo(file);
    credits[index] = next;
    await writeEventCredits(credits);
    return jsonOk(next);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Kaydedilemedi");
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const { id } = await ctx.params;
  const credits = await readEventCredits();
  await writeEventCredits(credits.filter((row) => row.id !== id));
  return jsonOk({ ok: true });
}
