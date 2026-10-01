import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api";
import { tickAgendaReminders } from "@/lib/agenda";
import { parseConcept } from "@/lib/session-concept";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  await tickAgendaReminders();
  const { id } = await ctx.params;
  const item = await prisma.agendaItem.findUnique({
    where: { id },
    include: { day: true },
  });
  if (!item) return jsonError("Oturum yok", 404);
  const panel = item.panelId
    ? await prisma.panel.findUnique({
        where: { id: item.panelId },
        select: {
          summary: true,
          concept: true,
          topic: true,
          participants: { include: { person: true }, orderBy: { sortOrder: "asc" } },
        },
      })
    : null;
  const lineup = (panel?.participants || [])
    .filter((p) => p.confirmed !== "Red")
    .map((p) => ({ name: p.person.name, title: p.person.role, organization: p.person.organization, role: p.role }));
  return jsonOk({
    id: item.id,
    title: item.title,
    type: item.type,
    description: item.description,
    summary: panel?.summary || item.description,
    concept: parseConcept(panel?.concept),
    lineup,
    location: item.location,
    startTime: item.startTime,
    endTime: item.endTime,
    date: item.day.date,
    themeTr: item.day.themeTr,
  });
}
