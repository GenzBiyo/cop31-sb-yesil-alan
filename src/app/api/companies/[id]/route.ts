import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const { id } = await ctx.params;
  if (user.role === "FIRMA" && user.companyId !== id) return jsonError("Yetkiniz yok", 403);
  const company = await prisma.company.findUnique({
    where: { id },
    include: { rules: true, submissions: { orderBy: { createdAt: "desc" } }, users: true },
  });
  if (!company) return jsonError("Firma bulunamadı", 404);
  return jsonOk(company);
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const { id } = await ctx.params;
  const body = await req.json();
  if (user.role === "FIRMA") {
    if (user.companyId !== id) return jsonError("Yetkiniz yok", 403);
    const company = await prisma.company.update({
      where: { id },
      data: {
        contactName: body.contactName,
        contactPhone: body.contactPhone,
        notes: body.notes,
      },
    });
    return jsonOk(company);
  }
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const company = await prisma.company.update({ where: { id }, data: body });
  return jsonOk(company);
}
