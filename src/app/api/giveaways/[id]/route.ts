import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!isAdmin(user.role)) return jsonError("Sponsorluğu yalnızca yönetici atar", 403);
  const { id } = await params;
  const existing = await prisma.giveawayItem.findUnique({ where: { id } });
  if (!existing) return jsonError("Kayıt yok", 404);

  const body = await req.json();
  const data: {
    companyId?: string | null;
    quantity?: number;
    title?: string;
    detail?: string;
    published?: boolean;
  } = {};

  if ("companyId" in body) {
    const companyId = body.companyId ? String(body.companyId) : null;
    if (companyId) {
      const company = await prisma.company.findUnique({ where: { id: companyId }, select: { id: true } });
      if (!company) return jsonError("Paydaş bulunamadı");
    }
    data.companyId = companyId;
  }
  if ("quantity" in body) {
    const quantity = Number(body.quantity);
    if (!Number.isInteger(quantity) || quantity < 0) return jsonError("Adet sıfır veya pozitif tam sayı olmalı");
    data.quantity = quantity;
  }
  if ("title" in body) {
    const title = String(body.title || "").trim();
    if (!title) return jsonError("Ad gerekli");
    data.title = title;
  }
  if ("detail" in body) data.detail = String(body.detail || "").trim();
  if ("published" in body) data.published = Boolean(body.published);

  const item = await prisma.giveawayItem.update({
    where: { id },
    data,
    include: { company: { select: { id: true, name: true } } },
  });
  return jsonOk(item);
}
