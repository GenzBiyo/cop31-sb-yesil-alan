import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api";
import { tickAgendaReminders } from "@/lib/agenda";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  await tickAgendaReminders();
  const { id } = await ctx.params;
  const item = await prisma.agendaItem.findUnique({
    where: { id },
    include: { day: true },
  });
  if (!item) return jsonError("Oturum yok", 404);
  return jsonOk({
    id: item.id,
    title: item.title,
    type: item.type,
    description: item.description,
    location: item.location,
    startTime: item.startTime,
    endTime: item.endTime,
    date: item.day.date,
    themeTr: item.day.themeTr,
  });
}
