import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { notifyCompanyDecision } from "@/lib/proposals";
import { broadcast } from "@/lib/realtime";
import {
  findSponsorConflict,
  forgetLiveSponsors,
  SPONSOR_APPROVED,
  SPONSOR_PENDING,
  SPONSOR_REJECTED,
  SPONSOR_STATUSES,
  validateSponsorSlot,
} from "@/lib/game-sponsors";

type Ctx = { params: Promise<{ id: string }> };

async function load(id: string) {
  return prisma.gameSponsorship.findUnique({
    where: { id },
    include: { company: { select: { name: true } }, game: { select: { title: true } } },
  });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const { id } = await ctx.params;
  const row = await load(id);
  if (!row) return jsonError("Kayıt yok", 404);
  const manager = canManage(user.role);
  const own = user.role === "FIRMA" && row.companyId === user.companyId;
  if (!manager && !(own && row.status === SPONSOR_PENDING)) return jsonError("Yetkiniz yok", 403);

  const body = await req.json();

  if (manager && (body.review === "approve" || body.review === "reject")) {
    const approve = body.review === "approve";
    if (approve) {
      const conflict = await findSponsorConflict(row);
      if (conflict) return jsonError(`Bu saat dolu: ${conflict.startTime}–${conflict.endTime} (${conflict.company.name})`);
    }
    const reviewNote = String(body.reviewNote || "").slice(0, 500);
    const updated = await prisma.gameSponsorship.update({
      where: { id },
      data: { status: approve ? SPONSOR_APPROVED : SPONSOR_REJECTED, reviewNote },
    });
    await notifyCompanyDecision({
      companyId: row.companyId,
      title: approve ? "Oyun sponsorluğunuz onaylandı" : "Oyun sponsorluğu talebiniz reddedildi",
      body: `${row.game.title} · ${row.date} ${row.startTime}–${row.endTime}${reviewNote ? `\nNot: ${reviewNote}` : ""}`,
    });
    forgetLiveSponsors();
    broadcast({ type: "agenda" });
    return jsonOk(updated);
  }

  const next = {
    gameId: body.gameId != null ? String(body.gameId) : row.gameId,
    date: body.date != null ? String(body.date) : row.date,
    startTime: body.startTime != null ? String(body.startTime) : row.startTime,
    endTime: body.endTime != null ? String(body.endTime) : row.endTime,
  };
  const slotError = validateSponsorSlot(next);
  if (slotError) return jsonError(slotError);
  const conflict = await findSponsorConflict({ id, ...next });
  if (conflict) return jsonError(`Bu saat dolu: ${conflict.startTime}–${conflict.endTime}`);

  const updated = await prisma.gameSponsorship.update({
    where: { id },
    data: {
      ...next,
      ...(body.prize != null ? { prize: String(body.prize).slice(0, 200) } : {}),
      ...(body.prizeQty != null ? { prizeQty: Math.max(0, Number(body.prizeQty) || 0) } : {}),
      ...(body.notes != null ? { notes: String(body.notes).slice(0, 1000) } : {}),
      ...(manager && body.companyId ? { companyId: String(body.companyId) } : {}),
      ...(manager && SPONSOR_STATUSES.includes(body.status) ? { status: body.status } : {}),
    },
  });
  forgetLiveSponsors();
  broadcast({ type: "agenda" });
  return jsonOk(updated);
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const { id } = await ctx.params;
  const row = await load(id);
  if (!row) return jsonError("Kayıt yok", 404);
  const own = user.role === "FIRMA" && row.companyId === user.companyId && row.status === SPONSOR_PENDING;
  if (!canManage(user.role) && !own) return jsonError("Yetkiniz yok", 403);
  await prisma.gameSponsorship.delete({ where: { id } });
  forgetLiveSponsors();
  broadcast({ type: "agenda" });
  return jsonOk({ ok: true });
}
