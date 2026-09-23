import { NextResponse } from "next/server";
import { readSession, type SessionUser } from "./auth";

export async function jsonOk(data: unknown, status = 200, headers?: HeadersInit) {
  return NextResponse.json(data, { status, headers });
}

export async function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function withUser() {
  const user = await readSession();
  if (!user) return { user: null as SessionUser | null, error: await jsonError("Oturum gerekli", 401) };
  return { user, error: null };
}

export function daysLeft(dueDate: string) {
  if (!dueDate) return null;
  const due = new Date(dueDate + "T00:00:00");
  if (Number.isNaN(due.getTime())) return null;
  return Math.ceil((due.getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000);
}

export function withTodoComputed<T extends { dueDate: string; status: string; risk: string; progress: number }>(todo: T) {
  const left = daysLeft(todo.dueDate);
  let risk = todo.risk;
  if (todo.status !== "Tamamlandı" && todo.status !== "İptal") {
    if (left != null && left < 0) risk = "GECİKTİ";
    else if (left != null && left <= 7) risk = "YAKLAŞIYOR";
    else if (risk === "YAKLAŞIYOR" || risk === "GECİKTİ") risk = "";
  }
  const progress =
    todo.status === "Tamamlandı" ? 100 : todo.status === "Başlanmadı" ? 0 : todo.progress;
  return { ...todo, remainingDays: left, risk, progress };
}
