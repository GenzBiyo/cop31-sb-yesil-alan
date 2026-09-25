import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { ensureEvents } from "@/lib/events-db";
import { broadcast } from "@/lib/realtime";
import { notifySbProposal, PENDING } from "@/lib/proposals";
import { slotByStart, validateEventSlot } from "@/lib/event-slots";

export async function GET() {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  await ensureEvents();
  const events = await prisma.pavilionEvent.findMany({
    include: { _count: { select: { signups: true } } },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
  const visible = canManage(user.role)
    ? events
    : events.filter((e) => {
        if (e.companyId && e.companyId === user.companyId) return true;
        return e.published && e.approvalStatus !== PENDING && e.approvalStatus !== "Reddedildi";
      });
  return jsonOk(visible);
}

export async function POST(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (user.role !== "FIRMA" && !canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  if (user.role === "FIRMA" && !user.companyId) return jsonError("Firma hesabı gerekli", 403);
  const body = await req.json();
  const fromFirma = user.role === "FIRMA";
  const company =
    fromFirma && user.companyId ? await prisma.company.findUnique({ where: { id: user.companyId } }) : null;
  const slot = slotByStart(String(body.startTime || ""));
  const startTime = slot?.start || "";
  const endTime = slot?.end || "";
  const occupied = await prisma.pavilionEvent.findMany({
    select: { id: true, date: true, startTime: true, endTime: true, approvalStatus: true },
  });
  const slotError = validateEventSlot({
    date: body.date || "2026-11-09",
    startTime,
    endTime,
    type: body.type || "survey",
    occupied,
  });
  if (slotError) return jsonError(slotError);
  const slug = String(body.slug || body.title || "etkinlik")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 48);
  const event = await prisma.pavilionEvent.create({
    data: {
      slug: `${slug}-${Date.now().toString(36).slice(-4)}`,
      title: body.title || "Yeni etkinlik",
      type: body.type || "survey",
      companyName: body.companyName || company?.name || "",
      topic: body.topic || "",
      date: body.date || "2026-11-09",
      startTime,
      endTime,
      location: body.location || (slot?.kind === "youth" ? "Sağlık Pavilionu — Etkileşim alanı" : "Sağlık Pavilionu"),
      description: body.description || "",
      gift: body.gift || "",
      config: typeof body.config === "string" ? body.config : JSON.stringify(body.config || {}),
      published: fromFirma ? false : body.published !== false,
      companyId: fromFirma ? user.companyId || "" : "",
      proposedById: fromFirma ? user.id : "",
      approvalStatus: fromFirma ? PENDING : "Onaylandı",
    },
  });
  if (fromFirma) {
    await notifySbProposal({
      title: "Firma etkinlik önerisi",
      body: `${company?.name || user.name}: ${event.title} · ${event.date} ${event.startTime}–${event.endTime}`,
      href: "/etkinlikler",
    });
  }
  broadcast({ type: "agenda" });
  return jsonOk(event, 201);
}
