import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { notifySbProposal } from "@/lib/proposals";
import { ensureSpeakers, saveSpeakerPhoto, speakerFields, SPEAKER_APPROVED, SPEAKER_PENDING } from "@/lib/speakers";

export const runtime = "nodejs";

export async function GET() {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role) && user.role !== "FIRMA") return jsonError("Yetkiniz yok", 403);
  await ensureSpeakers();
  const speakers = await prisma.speaker.findMany({
    where: canManage(user.role) ? {} : { companyId: user.companyId || "-" },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return jsonOk({ speakers });
}

export async function POST(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const manager = canManage(user.role);
  if (!manager && user.role !== "FIRMA") return jsonError("Yetkiniz yok", 403);
  if (!manager && !user.companyId) return jsonError("Firma hesabı gerekli", 403);

  const form = await req.formData();
  try {
    const fields = speakerFields(form);
    if (!fields.name) return jsonError("Konuşmacı adı gerekli");
    const company = !manager ? await prisma.company.findUnique({ where: { id: user.companyId! } }) : null;
    const photo = form.get("photo");
    const photoPath = photo instanceof File && photo.size ? await saveSpeakerPhoto(photo) : "";
    const last = await prisma.speaker.aggregate({ _max: { sortOrder: true } });
    const row = await prisma.speaker.create({
      data: {
        ...fields,
        organization: fields.organization || company?.name || "",
        photoPath,
        sortOrder: (last._max.sortOrder || 0) + 1,
        status: manager ? SPEAKER_APPROVED : SPEAKER_PENDING,
        companyId: manager ? "" : user.companyId!,
        proposedById: manager ? "" : user.id,
      },
    });
    if (!manager) {
      await notifySbProposal({
        title: "Firma konuşmacı önerisi",
        body: `${company?.name || user.name}: ${row.name}${row.title ? ` · ${row.title}` : ""}`,
        href: "/konusmaci-yonetimi",
      });
    }
    return jsonOk(row, 201);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Kayıt alınamadı");
  }
}
