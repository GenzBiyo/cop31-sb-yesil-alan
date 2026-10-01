import { prisma } from "@/lib/prisma";
import { jsonOk, withTodoComputed, withUser } from "@/lib/api";
import { canManage } from "@/lib/auth";

export async function GET() {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const ministry = canManage(user.role);
  const [todos, companies, panels, days, announcements, openQa] = await Promise.all([
    ministry ? prisma.todo.findMany() : Promise.resolve([]),
    prisma.company.findMany(),
    prisma.panel.findMany(),
    prisma.thematicDay.findMany({ include: { agenda: true }, orderBy: { date: "asc" } }),
    prisma.announcement.count(),
    prisma.thread.count({ where: { type: "qa", status: "Açık" } }),
  ]);
  const sponsorships = await prisma.gameSponsorship.findMany({
    where: {
      status: { in: ["Onay bekliyor", "Onaylandı", "Tamamlandı"] },
      ...(canManage(user.role) ? {} : { companyId: user.companyId || "-" }),
    },
    include: { company: { select: { name: true } }, game: { select: { title: true } } },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
  const nowLocal = new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 16).replace("T", " ");
  const gameSponsors = {
    approved: sponsorships.filter((s) => s.status === "Onaylandı").length,
    pending: sponsorships.filter((s) => s.status === "Onay bekliyor").length,
    done: sponsorships.filter((s) => s.status === "Tamamlandı").length,
    firms: new Set(sponsorships.filter((s) => s.status !== "Onay bekliyor").map((s) => s.companyId)).size,
    upcoming: sponsorships
      .filter((s) => s.status === "Onaylandı" && `${s.date} ${s.endTime}` > nowLocal)
      .slice(0, 6)
      .map((s) => ({
        id: s.id,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        game: s.game.title,
        company: s.company.name,
        prize: s.prize,
      })),
  };
  const computed = todos.map(withTodoComputed);
  const byStatus = computed.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});
  const avg =
    computed.length === 0 ? 0 : Math.round(computed.reduce((s, t) => s + t.progress, 0) / computed.length);
  return jsonOk({
    todos: ministry
      ? {
          total: computed.length,
          byStatus,
          avg,
          risk: computed.filter((t) => t.risk).length,
          upcoming: computed.filter((t) => t.remainingDays != null && t.remainingDays <= 7 && t.status !== "Tamamlandı").length,
        }
      : null,
    companies: {
      total: companies.length,
      confirmed: companies.filter((c) => c.status === "Onaylandı").length,
      pending: companies.filter((c) => c.status === "Beklemede").length,
    },
    panels: panels.filter((p) => p.status !== "Onay bekliyor" && p.status !== "Reddedildi").length,
    pendingProposals: canManage(user.role)
      ? {
          panels: panels.filter((p) => p.status === "Onay bekliyor" && p.kind !== "sunum").length,
          talks: panels.filter((p) => p.status === "Onay bekliyor" && p.kind === "sunum").length,
          events: await prisma.pavilionEvent.count({ where: { approvalStatus: "Onay bekliyor" } }),
        }
      : { panels: 0, events: 0 },
    announcements,
    openQa,
    gameSponsors,
    days,
    recentTodos: ministry ? computed.filter((t) => t.risk).slice(0, 8) : [],
  });
}
