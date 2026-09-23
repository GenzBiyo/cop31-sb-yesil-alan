import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withTodoComputed, withUser } from "@/lib/api";
import { broadcast } from "@/lib/realtime";

export async function GET() {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const todos = await prisma.todo.findMany({ orderBy: { no: "asc" } });
  return jsonOk(todos.map(withTodoComputed));
}

export async function POST(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const body = await req.json();
  const last = await prisma.todo.findFirst({ orderBy: { no: "desc" } });
  const todo = await prisma.todo.create({
    data: {
      no: body.no || (last?.no || 0) + 1,
      workPackage: body.workPackage || "Genel Koordinasyon",
      activity: body.activity || "Yeni faaliyet",
      detail: body.detail || "",
      startDate: body.startDate || "",
      dueDate: body.dueDate || "",
      unit: body.unit || "SGGM",
      owner: body.owner || "",
      status: body.status || "Başlanmadı",
      progress: Number(body.progress || 0),
      risk: body.risk || "",
      priority: body.priority || "Orta",
      notes: body.notes || "",
    },
  });
  broadcast({ type: "todo" });
  return jsonOk(withTodoComputed(todo), 201);
}
