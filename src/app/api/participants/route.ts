import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { ensureEvents } from "@/lib/events-db";

export async function GET() {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  await ensureEvents();
  const rows = await prisma.eventSignup.findMany({
    include: { visitor: true, event: true },
    orderBy: { createdAt: "desc" },
  });
  return jsonOk(rows);
}
