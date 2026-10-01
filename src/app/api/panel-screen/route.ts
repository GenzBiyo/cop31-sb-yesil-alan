import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { livePanel, PANEL_SCREEN_MODES, writePanelScreen, type PanelScreenMode } from "@/lib/panel-screen";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const { setting, panel } = await livePanel();
  return jsonOk({ setting, live: panel ? { id: panel.id, title: panel.title } : null });
}

export async function POST(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const body = await req.json().catch(() => ({}));
  const mode = String(body.mode || "");
  if (!(PANEL_SCREEN_MODES as readonly string[]).includes(mode)) return jsonError("Geçersiz ekran modu");
  const panelId = mode === "panel" ? String(body.panelId || "") : "";
  if (mode === "panel" && !(await prisma.panel.findUnique({ where: { id: panelId }, select: { id: true } }))) {
    return jsonError("Panel seçin");
  }
  await writePanelScreen({ mode: mode as PanelScreenMode, panelId });
  const { setting, panel } = await livePanel();
  return jsonOk({ setting, live: panel ? { id: panel.id, title: panel.title } : null });
}
