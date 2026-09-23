import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const { id } = await ctx.params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const key of ["title", "type", "companyName", "topic", "date", "startTime", "endTime", "location", "description", "gift"]) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  if (body.published !== undefined) data.published = Boolean(body.published);
  if (body.config !== undefined) data.config = typeof body.config === "string" ? body.config : JSON.stringify(body.config);
  const event = await prisma.pavilionEvent.update({ where: { id }, data });
  return jsonOk(event);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const { id } = await ctx.params;
  await prisma.pavilionEvent.delete({ where: { id } });
  return jsonOk({ ok: true });
}
