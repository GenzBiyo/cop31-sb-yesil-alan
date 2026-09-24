import { prisma } from "@/lib/prisma";
import { jsonOk, withUser } from "@/lib/api";
import { tickAgendaReminders } from "@/lib/agenda";

export async function GET() {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  await tickAgendaReminders();
  const items = await prisma.inboxItem.findMany({
    where: { userId: user.id, read: false },
    orderBy: { createdAt: "desc" },
    take: 8,
  });
  return jsonOk(items);
}
