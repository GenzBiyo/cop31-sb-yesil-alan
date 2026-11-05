import { prisma } from "./prisma";
import { isAmbassadorAccepted } from "./ambassador-card";

export async function elciMayCreatePanel(email: string) {
  const wanted = email.trim().toLocaleLowerCase("tr");
  if (!wanted) return false;
  const rows = await prisma.ambassadorApplication.findMany({
    where: { canCreatePanel: true },
    select: { email: true, status: true },
  });
  return rows.some(
    (row) => isAmbassadorAccepted(row.status) && row.email.trim().toLocaleLowerCase("tr") === wanted,
  );
}
