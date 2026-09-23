import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, withUser } from "@/lib/api";

export async function POST(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const body = await req.json();
  const companyId = user.role === "FIRMA" ? user.companyId : body.companyId;
  if (!companyId) return jsonError("Firma gerekli");
  const item = await prisma.companySubmission.create({
    data: {
      companyId,
      type: body.type || "application",
      title: body.title || "Yeni kayıt",
      payload: body.payload || "",
      status: body.status || "Gönderildi",
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
  if (user.role === "FIRMA" && existing.companyId !== user.companyId) return jsonError("Yetkiniz yok", 403);
  const item = await prisma.companySubmission.update({
    where: { id: body.id },
    data: {
      title: body.title ?? existing.title,
      payload: body.payload ?? existing.payload,
      status: body.status ?? existing.status,
      eventDate: body.eventDate ?? existing.eventDate,
    },
  });
  return jsonOk(item);
}
