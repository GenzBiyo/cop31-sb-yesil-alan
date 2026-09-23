import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withTodoComputed, withUser } from "@/lib/api";
import { broadcast } from "@/lib/realtime";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const { id } = await ctx.params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const key of [
    "workPackage",
    "activity",
    "detail",
    "startDate",
    "dueDate",
    "unit",
    "owner",
    "status",
    "risk",
    "priority",
    "notes",
  ]) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  if (body.progress !== undefined) data.progress = Number(body.progress);
  if (body.no !== undefined) data.no = Number(body.no);
  if (body.status === "Tamamlandı") data.progress = 100;
  if (body.status === "Başlanmadı") data.progress = 0;
  const todo = await prisma.todo.update({ where: { id }, data });
  broadcast({ type: "todo" });
  return jsonOk(withTodoComputed(todo));
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (user.role !== "ADMIN") return jsonError("Yetkiniz yok", 403);
  const { id } = await ctx.params;
  await prisma.todo.delete({ where: { id } });
  broadcast({ type: "todo" });
  return jsonOk({ ok: true });
}
