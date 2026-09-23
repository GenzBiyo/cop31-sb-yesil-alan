import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api";

export async function GET() {
  const session = await readSession();
  if (!session) return jsonError("Oturum yok", 401);
  const unread = await prisma.inboxItem.count({ where: { userId: session.id, read: false } });
  const openQa = await prisma.thread.count({
    where: {
      type: "qa",
      status: "Açık",
      ...(session.role === "FIRMA" ? { companyId: session.companyId || undefined } : {}),
    },
  });
  const pendingAccounts =
    session.role === "ADMIN"
      ? await prisma.user.count({ where: { role: "FIRMA", accountStatus: "Beklemede" } })
      : 0;
  return jsonOk({ ...session, unread, openQa, pendingAccounts });
}
