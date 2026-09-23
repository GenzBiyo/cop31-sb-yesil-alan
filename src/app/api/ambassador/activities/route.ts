import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { ensureAmbassadorForm } from "@/lib/ambassador-db";
import { sendMail } from "@/lib/mail";

export async function GET() {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  await ensureAmbassadorForm();
  const activities = await prisma.ambassadorActivity.findMany({
    include: { placements: { include: { application: true } } },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
  return jsonOk(activities);
}

export async function POST(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const body = await req.json();
  if (body.action === "assign") {
    const activity = await prisma.ambassadorActivity.findUnique({
      where: { id: body.activityId },
      include: { placements: true },
    });
    if (!activity) return jsonError("Aktivite yok", 404);
    if (activity.placements.length >= activity.capacity) return jsonError("Kontenjan doldu");
    const app = await prisma.ambassadorApplication.findUnique({ where: { id: body.applicationId } });
    if (!app) return jsonError("Başvuru yok", 404);
    const row = await prisma.ambassadorPlacement.create({
      data: {
        activityId: body.activityId,
        applicationId: body.applicationId,
        role: body.role || activity.roleNeed || "Saha desteği",
      },
    });
    await prisma.ambassadorApplication.update({
      where: { id: app.id },
      data: { status: "Yerleştirildi" },
    });
    if (body.notify !== false) {
      await sendMail(
        app.email,
        "İklim Sağlık Elçisi yerleştirmeniz",
        `Sayın ${app.fullName},\n\n${activity.date} ${activity.startTime}–${activity.endTime} saatleri arasında “${activity.title}” aktivitesine yerleştirildiniz.\nGörev: ${row.role}\nYer: ${activity.location}\n\nT.C. Sağlık Bakanlığı · COP31 Sağlık Pavilionu`
      );
    }
    return jsonOk(row, 201);
  }

  const created = await prisma.ambassadorActivity.create({
    data: {
      title: body.title || "Yeni aktivite",
      date: body.date || "2026-11-09",
      startTime: body.startTime || "09:00",
      endTime: body.endTime || "18:00",
      location: body.location || "Sağlık Pavilionu",
      description: body.description || "",
      roleNeed: body.roleNeed || "",
      capacity: Number(body.capacity || 8),
    },
  });
  return jsonOk(created, 201);
}

export async function DELETE(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const { searchParams } = new URL(req.url);
  const placementId = searchParams.get("placementId");
  const id = searchParams.get("id");
  if (placementId) {
    await prisma.ambassadorPlacement.delete({ where: { id: placementId } });
    return jsonOk({ ok: true });
  }
  if (id) {
    await prisma.ambassadorActivity.delete({ where: { id } });
    return jsonOk({ ok: true });
  }
  return jsonError("id gerekli");
}
