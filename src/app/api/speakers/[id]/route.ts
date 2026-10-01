import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { notifyCompanyDecision } from "@/lib/proposals";
import { saveSpeakerPhoto, speakerFields, SPEAKER_APPROVED, SPEAKER_PENDING, SPEAKER_REJECTED } from "@/lib/speakers";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const { id } = await ctx.params;
  const row = await prisma.speaker.findUnique({ where: { id } });
  if (!row) return jsonError("Kayıt yok", 404);
  const manager = canManage(user.role);
  const own = user.role === "FIRMA" && row.companyId === user.companyId && row.status === SPEAKER_PENDING;
  if (!manager && !own) return jsonError("Yetkiniz yok", 403);

  if ((req.headers.get("content-type") || "").includes("application/json")) {
    if (!manager) return jsonError("Yetkiniz yok", 403);
    const body = await req.json();
    if (body.review === "approve" || body.review === "reject") {
      const approve = body.review === "approve";
      const reviewNote = String(body.reviewNote || "").slice(0, 500);
      const updated = await prisma.speaker.update({
        where: { id },
        data: { status: approve ? SPEAKER_APPROVED : SPEAKER_REJECTED, reviewNote },
      });
      if (row.companyId) {
        await notifyCompanyDecision({
          proposedById: row.proposedById || undefined,
          companyId: row.companyId,
          title: approve ? "Konuşmacınız onaylandı" : "Konuşmacı öneriniz reddedildi",
          body: `${row.name}${reviewNote ? `\nNot: ${reviewNote}` : ""}`,
        });
      }
      return jsonOk(updated);
    }
    if (body.move === "up" || body.move === "down") {
      const list = await prisma.speaker.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
      const index = list.findIndex((s) => s.id === id);
      const target = body.move === "up" ? index - 1 : index + 1;
      if (target >= 0 && target < list.length) {
        [list[index], list[target]] = [list[target], list[index]];
        await prisma.$transaction(
          list.map((s, i) => prisma.speaker.update({ where: { id: s.id }, data: { sortOrder: i + 1 } }))
        );
      }
      return jsonOk({ ok: true });
    }
    if (typeof body.active === "boolean") {
      return jsonOk(await prisma.speaker.update({ where: { id }, data: { active: body.active } }));
    }
    return jsonError("Geçersiz istek");
  }

  const form = await req.formData();
  try {
    const fields = speakerFields(form);
    if (!fields.name) return jsonError("Konuşmacı adı gerekli");
    const photo = form.get("photo");
    const photoPath = photo instanceof File && photo.size ? await saveSpeakerPhoto(photo) : undefined;
    const updated = await prisma.speaker.update({
      where: { id },
      data: {
        ...fields,
        ...(photoPath ? { photoPath } : {}),
        ...(form.get("removePhoto") === "1" && !photoPath ? { photoPath: "" } : {}),
      },
    });
    return jsonOk(updated);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Kayıt alınamadı");
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const { id } = await ctx.params;
  const row = await prisma.speaker.findUnique({ where: { id } });
  if (!row) return jsonError("Kayıt yok", 404);
  const own = user.role === "FIRMA" && row.companyId === user.companyId && row.status === SPEAKER_PENDING;
  if (!canManage(user.role) && !own) return jsonError("Yetkiniz yok", 403);
  await prisma.speaker.delete({ where: { id } });
  return jsonOk({ ok: true });
}
