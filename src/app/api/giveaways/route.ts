import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonOk, withUser } from "@/lib/api";
import { CONTRACTED_SUPPLIER, ensureGiveawayCatalog } from "@/lib/giveaways";

export async function GET() {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  await ensureGiveawayCatalog();
  const staff = canManage(user.role);
  const items = await prisma.giveawayItem.findMany({
    where: staff ? { published: true } : { published: true },
    include: {
      pledges: {
        include: { company: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });
  const visible = items.map((item) => {
    const packagesTaken = item.pledges.reduce((sum, pledge) => sum + pledge.packages, 0);
    const pledges = staff
      ? item.pledges
      : item.pledges
          .filter((pledge) => pledge.companyId === user.companyId)
          .map((pledge) => ({ ...pledge, company: { id: pledge.company.id, name: pledge.company.name } }));
    return { ...item, packagesTaken, pledges };
  });
  return jsonOk({ items: visible, staff, companyId: user.companyId, supplier: CONTRACTED_SUPPLIER });
}
