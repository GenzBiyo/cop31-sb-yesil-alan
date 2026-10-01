import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { broadcast } from "@/lib/realtime";

export const dynamic = "force-dynamic";

const KEY = /^(panel|event|agenda)-[a-z0-9]{8,40}$/i;

export async function GET() {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const rows = await prisma.calendarJoin.findMany({
    where: user.companyId ? { OR: [{ userId: user.id }, { companyId: user.companyId }] } : { userId: user.id },
    select: { itemKey: true },
  });
  return jsonOk({ keys: [...new Set(rows.map((r) => r.itemKey))] });
}

export async function POST(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const body = await req.json().catch(() => ({}));
  const itemKey = String(body.itemKey || "");
  if (!KEY.test(itemKey)) return jsonError("Geçersiz oturum");
  await prisma.calendarJoin.upsert({
    where: { userId_itemKey: { userId: user.id, itemKey } },
    update: {},
    create: { userId: user.id, companyId: user.companyId || "", itemKey },
  });
  broadcast({ type: "agenda" });
  return jsonOk({ ok: true }, 201);
}

export async function DELETE(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const itemKey = req.nextUrl.searchParams.get("itemKey") || "";
  await prisma.calendarJoin.deleteMany({
    where: user.companyId ? { itemKey, OR: [{ userId: user.id }, { companyId: user.companyId }] } : { itemKey, userId: user.id },
  });
  broadcast({ type: "agenda" });
  return jsonOk({ ok: true });
}
