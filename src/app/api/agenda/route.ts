import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { broadcast } from "@/lib/realtime";
import { memoClear } from "@/lib/memo";
import { venueBookingError } from "@/lib/venue-booking";
import { canonicalVenue, SB_PAVILYON, sessionKind } from "@/lib/venues";

export async function POST(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const body = await req.json();
  const type = body.type || "Panel";
  const kind = sessionKind(type);
  const day = await prisma.thematicDay.findUnique({ where: { id: String(body.dayId || "") } });
  if (!day) return jsonError("Gün seçin");
  const location = kind ? canonicalVenue(String(body.location || "")) || SB_PAVILYON : String(body.location || "Sağlık Pavilionu — Ana Sahne");
  const startTime = String(body.startTime || (kind ? "" : "10:00"));
  const endTime = String(body.endTime || (kind ? "" : "11:00"));
  if (kind) {
    const clash = await venueBookingError({ location, date: day.date, startTime, endTime, kind });
    if (clash) return jsonError(clash);
  }
  const item = await prisma.agendaItem.create({
    data: {
      dayId: body.dayId,
      startTime: kind ? startTime : startTime || "10:00",
      endTime: kind ? endTime : endTime || "11:00",
      title: body.title || "Yeni oturum",
      description: body.description || "",
      location,
      type,
      panelId: body.panelId || null,
      companyId: body.companyId || null,
      status: body.status || "Planlandı",
      sortOrder: Number(body.sortOrder || 0),
    },
  });
  memoClear("public-program");
  broadcast({ type: "agenda" });
  return jsonOk(item, 201);
}
