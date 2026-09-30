import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { COMPLIANCE_TYPES } from "@/lib/pavilion-rules";

const COMPLIANCE = new Set<string>(COMPLIANCE_TYPES);

export async function GET() {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const items = await prisma.companySubmission.findMany({
    where: { type: { in: [...COMPLIANCE_TYPES] } },
    include: { company: { select: { id: true, name: true, booth: true } } },
    orderBy: { createdAt: "desc" },
  });
  return jsonOk(items);
}

export async function POST(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const body = await req.json();
  const companyId = user.role === "FIRMA" ? user.companyId : body.companyId;
  if (!companyId) return jsonError("Firma gerekli");
  const type = String(body.type || "application");
  const compliance = COMPLIANCE.has(type);
  if (compliance && !String(body.title || "").trim()) return jsonError("Tanım gerekli");
  if (compliance && !String(body.quantity || "").trim()) return jsonError("Adet gerekli");
  const item = await prisma.companySubmission.create({
    data: {
      companyId,
      type,
      title: body.title || "Yeni kayıt",
      payload: body.payload || "",
      quantity: compliance ? String(body.quantity || "").trim() : "",
      status: compliance ? "Onay bekliyor" : body.status || "Gönderildi",
      eventDate: body.eventDate || "",
    },
  });
  return jsonOk(item, 201);
}

export async function PATCH(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const body = await req.json();
  const existing = await prisma.companySubmission.findUnique({ where: { id: body.id } });
  if (!existing) return jsonError("Kayıt yok", 404);
  const manager = canManage(user.role);
  if (!manager && existing.companyId !== user.companyId) return jsonError("Yetkiniz yok", 403);

  if (COMPLIANCE.has(existing.type)) {
    if (!manager) {
      if (existing.status === "Uygun") return jsonError("Uygun bulunan kayıt değiştirilemez", 403);
      const item = await prisma.companySubmission.update({
        where: { id: body.id },
        data: {
          title: body.title ?? existing.title,
          payload: body.payload ?? existing.payload,
          quantity: body.quantity ?? existing.quantity,
          eventDate: body.eventDate ?? existing.eventDate,
          status: "Onay bekliyor",
          reviewNote: "",
        },
      });
      return jsonOk(item);
    }
    const status = body.status ?? existing.status;
    if (!["Onay bekliyor", "Uygun", "Uygun değil"].includes(status)) return jsonError("Geçersiz karar");
    if (status === "Uygun değil" && !String(body.reviewNote ?? existing.reviewNote).trim()) {
      return jsonError("Uygun değil kararı için gerekçe yazın");
    }
    const item = await prisma.companySubmission.update({
      where: { id: body.id },
      data: {
        status,
        reviewNote: body.reviewNote ?? existing.reviewNote,
      },
    });
    return jsonOk(item);
  }

  if (!manager && body.status && body.status !== existing.status) return jsonError("Yetkiniz yok", 403);
  const item = await prisma.companySubmission.update({
    where: { id: body.id },
    data: {
      title: body.title ?? existing.title,
      payload: body.payload ?? existing.payload,
      status: manager ? body.status ?? existing.status : existing.status,
      eventDate: body.eventDate ?? existing.eventDate,
    },
  });
  return jsonOk(item);
}
