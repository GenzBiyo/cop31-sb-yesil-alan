import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";

export async function POST(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const body = await req.json();
  if (body.action === "assign" && canManage(user.role)) {
    const rule = await prisma.companyRule.create({
      data: {
        companyId: body.companyId,
        title: body.title,
        body: body.body || "",
        dueDate: body.dueDate || "",
        mandatory: body.mandatory !== false,
        status: "Bekliyor",
      },
    });
    return jsonOk(rule, 201);
  }
  if (body.action === "status") {
    const existing = await prisma.companyRule.findUnique({ where: { id: body.id } });
    if (!existing) return jsonError("Kural yok", 404);
    if (user.role === "FIRMA" && existing.companyId !== user.companyId) return jsonError("Yetkiniz yok", 403);
    const rule = await prisma.companyRule.update({
      where: { id: body.id },
      data: { status: body.status },
    });
    return jsonOk(rule);
  }
  return jsonError("Geçersiz işlem");
}
