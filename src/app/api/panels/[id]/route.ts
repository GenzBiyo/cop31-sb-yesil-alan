import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { broadcast } from "@/lib/realtime";
import { sendMail } from "@/lib/mail";
import { setPanelGuests, syncPanelAgenda } from "@/lib/panels";
import { THEME_TR } from "@/lib/constants";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const { id } = await ctx.params;
  const body = await req.json();
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
  if (body.status != null) data.status = body.status;
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
  await syncPanelAgenda(panel);
  broadcast({ type: "panel" });
  return jsonOk(panel);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const { id } = await ctx.params;
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
