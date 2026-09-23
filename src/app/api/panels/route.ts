import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { broadcast } from "@/lib/realtime";
import { setPanelGuests, syncPanelAgenda } from "@/lib/panels";
import { THEME_TR } from "@/lib/constants";

function guestsFromBody(body: { moderator?: string; moderatorOrg?: string; speakers?: { name: string; organization?: string }[] | string }) {
  const moderatorName = String(body.moderator || "").trim();
  const moderator = moderatorName ? { name: moderatorName, organization: String(body.moderatorOrg || "") } : null;
  let speakers: { name: string; organization?: string }[] = [];
  if (Array.isArray(body.speakers)) {
    speakers = body.speakers;
  } else if (typeof body.speakers === "string") {
    speakers = body.speakers
      .split(/,|\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name) => ({ name }));
  }
  return { moderator, speakers };
}

export async function GET() {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const panels = await prisma.panel.findMany({
    include: {
      participants: { include: { person: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
  const people = await prisma.person.findMany({ orderBy: { name: "asc" } });
  return jsonOk({ panels, people, days: Object.entries(THEME_TR).map(([date, theme]) => ({ date, theme })) });
}

export async function POST(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const body = await req.json();
  if (body.action === "person") {
    const person = await prisma.person.create({
      data: {
        name: body.name,
        role: body.role || "",
        organization: body.organization || "",
        email: body.email || "",
        phone: body.phone || "",
        track: body.track || "",
        kind: body.kind || "speaker",
        note: body.note || "",
      },
    });
    return jsonOk(person, 201);
  }
  if (!String(body.title || "").trim()) return jsonError("Başlık gerekli");
  if (!body.date) return jsonError("Gün seçin");
  const kind = body.kind === "sunum" ? "sunum" : "panel";
  const panel = await prisma.panel.create({
    data: {
      title: String(body.title).trim(),
      kind,
      date: body.date,
      startTime: body.startTime || "10:00",
      endTime: body.endTime || "11:30",
      theme: body.theme || THEME_TR[body.date] || "",
      topic: body.topic || "",
      location: body.location || "Sağlık Pavilionu — Ana Sahne",
      partners: body.partners || "",
      status: body.status || "Planlama",
      notes: body.notes || "",
    },
  });
  const { moderator, speakers } = guestsFromBody(body);
  await setPanelGuests(panel.id, moderator, speakers);
  await syncPanelAgenda(panel);
  broadcast({ type: "panel" });
  const full = await prisma.panel.findUnique({
    where: { id: panel.id },
    include: { participants: { include: { person: true } } },
  });
  return jsonOk(full, 201);
}
