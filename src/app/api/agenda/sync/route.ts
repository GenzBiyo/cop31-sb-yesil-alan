import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { broadcast } from "@/lib/realtime";
import { fetchWorkbook } from "@/lib/sheets";
import { applyAgendaSessions, parseAgendaWorkbook } from "@/lib/agenda-sheet";
import { SHEET_AGENDA } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!isAdmin(user.role)) return jsonError("Yetkiniz yok", 403);
  const body = await req.json().catch(() => ({}));
  const sheetId = String(body.sheetId || SHEET_AGENDA).trim();
  if (!/^[\w-]{10,}$/.test(sheetId)) return jsonError("Geçersiz tablo bağlantısı");

  try {
    const workbook = await fetchWorkbook(sheetId);
    const sessions = parseAgendaWorkbook(workbook);
    const result = await applyAgendaSessions(sessions);
    await prisma.setting.upsert({
      where: { key: "agendaSheetId" },
      update: { value: sheetId },
      create: { key: "agendaSheetId", value: sheetId },
    });
    broadcast({ type: "agenda" });
    broadcast({ type: "panel" });
    return jsonOk(result);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Takvim güncellenemedi", 502);
  }
}
