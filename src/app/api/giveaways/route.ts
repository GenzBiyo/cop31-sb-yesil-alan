import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { jsonOk, withUser } from "@/lib/api";
import { ensureGiveawayCatalog } from "@/lib/giveaways";

export async function GET() {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  await ensureGiveawayCatalog();
  const admin = isAdmin(user.role);
  const [items, companies] = await Promise.all([
    prisma.giveawayItem.findMany({
      where: admin ? undefined : { published: true },
      include: { company: { select: { id: true, name: true } } },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    }),
    admin
      ? prisma.company.findMany({
          where: { status: "Onaylandı" },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);
  return jsonOk({ items, companies, admin });
}
