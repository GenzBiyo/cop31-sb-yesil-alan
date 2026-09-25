import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { broadcast } from "@/lib/realtime";
import { sendMail } from "@/lib/mail";
import { setPanelGuests, syncPanelAgenda } from "@/lib/panels";
import { THEME_TR } from "@/lib/constants";
import { APPROVED, notifyCompanyDecision, PENDING, REJECTED } from "@/lib/proposals";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const { id } = await ctx.params;
  const existing = await prisma.panel.findUnique({ where: { id } });
  if (!existing) return jsonError("Panel yok", 404);
  const body = await req.json();

  if (body.review) {
    if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
    const decision = String(body.review);
    const ok = decision === APPROVED || decision === "approve";
    const no = decision === REJECTED || decision === "reject";
    if (!ok && !no) return jsonError("Geçersiz karar");
    const panel = await prisma.panel.update({
      where: { id },
      data: { status: ok ? "Planlama" : REJECTED },
    });
    if (ok) await syncPanelAgenda(panel);
    else await prisma.agendaItem.deleteMany({ where: { panelId: id } });
    await notifyCompanyDecision({
      proposedById: existing.proposedById,
      companyId: existing.companyId,
      title: ok ? "Panel / sunum öneriniz onaylandı" : "Panel / sunum öneriniz reddedildi",
      body: `${existing.title} · ${existing.date} ${existing.startTime}–${existing.endTime}${body.message ? `\n\n${body.message}` : ""}`,
    });
    broadcast({ type: "panel" });
    broadcast({ type: "agenda" });
    return jsonOk(panel);
  }

  const ownPending = user.role === "FIRMA" && existing.companyId === user.companyId && existing.status === PENDING;
  if (!canManage(user.role) && !ownPending) return jsonError("Yetkiniz yok", 403);

  const data: Record<string, unknown> = {};
  if (body.title != null) data.title = String(body.title).trim();
  if (body.kind != null) data.kind = body.kind === "sunum" ? "sunum" : "panel";
  if (body.date != null) {
    data.date = body.date;
    data.theme = THEME_TR[body.date] || body.theme || "";
  }
  if (body.startTime != null) data.startTime = body.startTime;
  if (body.endTime != null) data.endTime = body.endTime;
  if (body.topic != null) data.topic = body.topic;
  if (body.location != null) data.location = body.location;
  if (body.partners != null) data.partners = body.partners;
  if (body.status != null && canManage(user.role) && body.status !== PENDING) data.status = body.status;
  if (body.notes != null) data.notes = body.notes;
  const panel = await prisma.panel.update({ where: { id }, data });
  if (body.moderator != null || body.speakers != null) {
    const moderatorName = String(body.moderator || "").trim();
    const speakers = Array.isArray(body.speakers)
      ? body.speakers
      : String(body.speakers || "")
          .split(/,|\n/)
          .map((s: string) => s.trim())
          .filter(Boolean)
          .map((name: string) => ({ name }));
    await setPanelGuests(
      id,
      moderatorName ? { name: moderatorName, organization: String(body.moderatorOrg || "") } : null,
      speakers,
    );
  }
  if (panel.status !== PENDING && panel.status !== REJECTED) await syncPanelAgenda(panel);
  broadcast({ type: "panel" });
  return jsonOk(panel);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const { id } = await ctx.params;
  const existing = await prisma.panel.findUnique({ where: { id } });
  if (!existing) return jsonError("Panel yok", 404);
  const ownPending = user.role === "FIRMA" && existing.companyId === user.companyId && existing.status === PENDING;
  if (!canManage(user.role) && !ownPending) return jsonError("Yetkiniz yok", 403);
  await prisma.agendaItem.deleteMany({ where: { panelId: id } });
  await prisma.panel.delete({ where: { id } });
  broadcast({ type: "panel" });
  broadcast({ type: "agenda" });
  return jsonOk({ ok: true });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const { id } = await ctx.params;
  const body = await req.json();

  if (body.action === "assign") {
    if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
    const row = await prisma.panelPerson.create({
      data: {
        panelId: id,
        personId: body.personId,
        role: body.role || "panelist",
        confirmed: body.confirmed || "Davet edildi",
      },
    });
    broadcast({ type: "panel" });
    return jsonOk(row, 201);
  }

  if (body.action === "confirm") {
    if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
    const row = await prisma.panelPerson.update({
      where: { id: body.participantId },
      data: { confirmed: body.confirmed },
    });
    broadcast({ type: "panel" });
    return jsonOk(row);
  }

  if (body.action === "message") {
    const msg = await prisma.panelMessage.create({
      data: { panelId: id, authorId: user.id, body: body.body },
    });
    const panel = await prisma.panel.findUnique({
      where: { id },
      include: { participants: { include: { person: true } } },
    });
    if (panel && body.notify) {
      for (const p of panel.participants) {
        if (p.person.email) {
          await sendMail(
            p.person.email,
            `COP31 Panel: ${panel.title}`,
            `${user.name}: ${body.body}\n\nOturum: ${panel.date} ${panel.startTime}–${panel.endTime}`
          );
        }
      }
    }
    broadcast({ type: "panel" });
    return jsonOk(msg, 201);
  }

  return jsonError("Geçersiz işlem");
}
