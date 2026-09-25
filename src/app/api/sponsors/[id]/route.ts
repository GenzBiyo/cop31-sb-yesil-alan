import { unlink } from "fs/promises";
import path from "path";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { publicLogoPath } from "@/lib/sponsors";

export const runtime = "nodejs";

async function removeFile(logoPath: string) {
  const clean = publicLogoPath(logoPath);
  if (!clean.startsWith("/uploads/sponsors/")) return;
  try {
    await unlink(path.join(process.cwd(), "public", clean));
  } catch {
    /* already gone */
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!isAdmin(user.role)) return jsonError("Yetkiniz yok", 403);
  const { id } = await ctx.params;
  const existing = await prisma.sponsor.findUnique({ where: { id } });
  if (!existing) return jsonError("Sponsor yok", 404);
  const body = await req.json();
  const data: { name?: string; url?: string; sortOrder?: number; active?: boolean } = {};
  if (body.name !== undefined) {
    const name = String(body.name || "").trim();
    if (!name) return jsonError("Sponsor adı gerekli");
    data.name = name;
  }
  if (body.url !== undefined) data.url = String(body.url || "").trim();
  if (typeof body.sortOrder === "number") data.sortOrder = body.sortOrder;
  if (typeof body.active === "boolean") data.active = body.active;
  const row = await prisma.sponsor.update({ where: { id }, data });
  return jsonOk(row);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!isAdmin(user.role)) return jsonError("Yetkiniz yok", 403);
  const { id } = await ctx.params;
  const existing = await prisma.sponsor.findUnique({ where: { id } });
  if (!existing) return jsonError("Sponsor yok", 404);
  await prisma.sponsor.delete({ where: { id } });
  await removeFile(existing.logoPath);
  return jsonOk({ ok: true });
}
