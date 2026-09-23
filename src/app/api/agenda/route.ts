import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { broadcast } from "@/lib/realtime";

export async function POST(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const body = await req.json();
  const item = await prisma.agendaItem.create({
    data: {
      dayId: body.dayId,
      startTime: body.startTime || "10:00",
      endTime: body.endTime || "11:00",
      title: body.title || "Yeni oturum",
      description: body.description || "",
      location: body.location || "Sağlık Pavilionu — Ana Sahne",
      type: body.type || "Panel",
      panelId: body.panelId || null,
      companyId: body.companyId || null,
      status: body.status || "Planlandı",
      sortOrder: Number(body.sortOrder || 0),
    },
  });
  broadcast({ type: "agenda" });
  return jsonOk(item, 201);
}
