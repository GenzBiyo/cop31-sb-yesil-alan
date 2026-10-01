import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { applyAccountStatus } from "@/lib/accounts";

export async function GET() {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (user.role !== "ADMIN") return jsonError("Yetkiniz yok", 403);
  const accounts = await prisma.user.findMany({
    where: { role: "FIRMA" },
    include: { company: true },
    orderBy: { createdAt: "desc" },
  });
  return jsonOk(accounts);
}

export async function PATCH(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (user.role !== "ADMIN") return jsonError("Yetkiniz yok", 403);
  const body = await req.json();
  if (!body.id || !body.accountStatus) return jsonError("id ve hesap durumu gerekli");
  try {
    return jsonOk(await applyAccountStatus(String(body.id), String(body.accountStatus), body.message || undefined));
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Güncellenemedi", 404);
  }
}
