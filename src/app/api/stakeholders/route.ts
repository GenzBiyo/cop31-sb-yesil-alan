import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { toRow } from "@/lib/stakeholder-form";
import { importStakeholderXlsx } from "@/lib/stakeholder-import";

export async function GET() {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const rows = await prisma.stakeholderResponse.findMany({ orderBy: { companyName: "asc" } });
  return jsonOk({ responses: rows.map(toRow) });
}

export async function POST(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return jsonError("Excel dosyası seçin");
  try {
    const result = await importStakeholderXlsx(await file.arrayBuffer());
    return jsonOk(result);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Excel okunamadı");
  }
}

export async function DELETE(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (user.role !== "ADMIN") return jsonError("Yetkiniz yok", 403);
  const id = req.nextUrl.searchParams.get("id") || "";
  await prisma.stakeholderResponse.delete({ where: { id } }).catch(() => null);
  return jsonOk({ ok: true });
}
