import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";

export async function GET() {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const zones = await prisma.spaceZone.findMany({ orderBy: { name: "asc" } });
  return jsonOk(zones);
}

export async function PATCH(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const body = await req.json();
  const zone = await prisma.spaceZone.update({ where: { id: body.id }, data: body });
  return jsonOk(zone);
}
