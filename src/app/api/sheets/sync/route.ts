import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { fetchWorkbook, mergeTodosFromWorkbook, mergeCalendarFromWorkbook, loadWorkbookFromBuffer } from "@/lib/sheets";
import { broadcast } from "@/lib/realtime";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const body = await req.json().catch(() => ({}));
  const source = body.source || "google";
  const settings = Object.fromEntries((await prisma.setting.findMany()).map((s) => [s.key, s.value]));
  const todosId = body.todosSheetId || settings.todosSheetId;
  const companiesId = body.companiesSheetId || settings.companiesSheetId;

  try {
    if (source === "local") {
      const local = path.join(process.cwd(), "data", "sb-todos.xlsx");
      const buf = fs.readFileSync(local);
      const wb = await loadWorkbookFromBuffer(buf);
      const todos = await mergeTodosFromWorkbook(wb);
      const calBuf = fs.readFileSync(path.join(process.cwd(), "data", "companies-panels.xlsx"));
      const calWb = await loadWorkbookFromBuffer(calBuf);
      const cal = await mergeCalendarFromWorkbook(calWb);
      broadcast({ type: "todo" });
      return jsonOk({ todos, calendar: cal, source: "local" });
    }
    const todosWb = await fetchWorkbook(todosId);
    const todos = await mergeTodosFromWorkbook(todosWb);
    let calendar = { days: 0 };
    try {
      const calWb = await fetchWorkbook(companiesId);
      calendar = await mergeCalendarFromWorkbook(calWb);
    } catch {
      calendar = { days: 0 };
    }
    if (body.todosSheetId) {
      await prisma.setting.upsert({
        where: { key: "todosSheetId" },
        update: { value: todosId },
        create: { key: "todosSheetId", value: todosId },
      });
    }
    broadcast({ type: "todo" });
    return jsonOk({ todos, calendar, source: "google" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Senkron hatası";
    return jsonError(message, 502);
  }
}
