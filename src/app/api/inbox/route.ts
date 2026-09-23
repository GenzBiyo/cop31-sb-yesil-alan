import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonOk, withUser } from "@/lib/api";

export async function GET() {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const items = await prisma.inboxItem.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return jsonOk(items);
}

export async function PATCH(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const body = await req.json();
  if (body.all) {
    await prisma.inboxItem.updateMany({ where: { userId: user.id }, data: { read: true } });
    return jsonOk({ ok: true });
  }
  const item = await prisma.inboxItem.update({ where: { id: body.id }, data: { read: true } });
  return jsonOk(item);
}
