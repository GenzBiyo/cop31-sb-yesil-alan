import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { ensureEvents } from "@/lib/events-db";
import { broadcast } from "@/lib/realtime";

export async function GET() {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  await ensureEvents();
  const events = await prisma.pavilionEvent.findMany({
    include: { _count: { select: { signups: true } } },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
  return jsonOk(events);
}

export async function POST(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const body = await req.json();
  const slug = String(body.slug || body.title || "etkinlik")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 48);
  const event = await prisma.pavilionEvent.create({
    data: {
      slug: `${slug}-${Date.now().toString(36).slice(-4)}`,
      title: body.title || "Yeni etkinlik",
      type: body.type || "survey",
      companyName: body.companyName || "",
      topic: body.topic || "",
      date: body.date || "2026-11-09",
      startTime: body.startTime || "10:00",
      endTime: body.endTime || "18:00",
      location: body.location || "Sağlık Pavilionu",
      description: body.description || "",
      gift: body.gift || "",
      config: typeof body.config === "string" ? body.config : JSON.stringify(body.config || {}),
      published: body.published !== false,
    },
  });
  broadcast({ type: "agenda" });
  return jsonOk(event, 201);
}
