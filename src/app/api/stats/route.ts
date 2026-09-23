import { prisma } from "@/lib/prisma";
import { jsonOk, withTodoComputed, withUser } from "@/lib/api";

export async function GET() {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const [todos, companies, panels, days, announcements, openQa] = await Promise.all([
    prisma.todo.findMany(),
    prisma.company.findMany(),
    prisma.panel.findMany(),
    prisma.thematicDay.findMany({ include: { agenda: true }, orderBy: { date: "asc" } }),
    prisma.announcement.count(),
    prisma.thread.count({ where: { type: "qa", status: "Açık" } }),
  ]);
  const computed = todos.map(withTodoComputed);
  const byStatus = computed.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});
  const avg =
    computed.length === 0 ? 0 : Math.round(computed.reduce((s, t) => s + t.progress, 0) / computed.length);
  return jsonOk({
    todos: {
      total: computed.length,
      byStatus,
      avg,
      risk: computed.filter((t) => t.risk).length,
      upcoming: computed.filter((t) => t.remainingDays != null && t.remainingDays <= 7 && t.status !== "Tamamlandı").length,
    },
    companies: {
      total: companies.length,
      confirmed: companies.filter((c) => c.status === "Onaylandı").length,
      pending: companies.filter((c) => c.status === "Beklemede").length,
    },
    panels: panels.length,
    announcements,
    openQa,
    days,
    recentTodos: computed.filter((t) => t.risk).slice(0, 8),
  });
}
