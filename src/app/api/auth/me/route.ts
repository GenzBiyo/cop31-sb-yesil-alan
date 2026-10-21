import { clearSessionCookie, readSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api";
import { pendingProposalCounts } from "@/lib/proposals";
import { memoGet, memoSet } from "@/lib/memo";
import { renameAstorgToOxoid } from "@/lib/oxoid";

export async function GET() {
  const session = await readSession();
  if (!session) return jsonError("Oturum yok", 401);
  const account = await prisma.user.findUnique({
    where: { id: session.id },
    select: { accountStatus: true, company: { select: { kind: true, name: true } } },
  });
  if (!account || account.accountStatus !== "Onaylandı") {
    await clearSessionCookie();
    return jsonError("Oturum yok", 401);
  }
  const meKey = `me:${session.id}`;
  const cachedMe = memoGet<Record<string, unknown>>(meKey, 8000);
  if (cachedMe) return jsonOk(cachedMe);
  await renameAstorgToOxoid();
  const staff = session.role === "ADMIN" || session.role === "SAGLIK";
  const heavyKey = `me-heavy:${session.id}:${session.role}`;
  const heavy = memoGet<{
    pendingAccounts: number;
    proposals: { panels: number; talks: number; events: number; total: number };
    pendingCompliance: number;
    pendingGameSponsors: number;
    pendingSpeakers: number;
    pendingAmbassadors: number;
  }>(heavyKey, 20000);
  const [unread, openQa, counts] = await Promise.all([
    prisma.inboxItem.count({ where: { userId: session.id, read: false } }),
    prisma.thread.count({
      where: {
        type: "qa",
        status: "Açık",
        ...(session.role === "FIRMA" ? { companyId: session.companyId || undefined } : {}),
      },
    }),
    heavy
      ? Promise.resolve(heavy)
      : Promise.all([
          session.role === "ADMIN"
            ? prisma.user.count({ where: { role: "FIRMA", accountStatus: "Beklemede" } })
            : Promise.resolve(0),
          staff ? pendingProposalCounts() : Promise.resolve({ panels: 0, talks: 0, events: 0, total: 0 }),
          staff
            ? prisma.companySubmission.count({
                where: { type: { in: ["etkinlik", "ikram", "esantiyon"] }, status: "Onay bekliyor" },
              })
            : Promise.resolve(0),
          staff ? prisma.gameSponsorship.count({ where: { status: "Onay bekliyor" } }) : Promise.resolve(0),
          staff ? prisma.speaker.count({ where: { status: "Onay bekliyor" } }) : Promise.resolve(0),
          staff ? prisma.ambassadorApplication.count({ where: { status: "Beklemede" } }) : Promise.resolve(0),
        ]).then(([pendingAccounts, proposals, pendingCompliance, pendingGameSponsors, pendingSpeakers, pendingAmbassadors]) =>
          memoSet(heavyKey, {
            pendingAccounts,
            proposals,
            pendingCompliance,
            pendingGameSponsors,
            pendingSpeakers,
            pendingAmbassadors,
          })
        ),
  ]);
  const { pendingAccounts, proposals, pendingCompliance, pendingGameSponsors, pendingSpeakers, pendingAmbassadors } = counts;
  return jsonOk(
    memoSet(meKey, {
      ...session,
      accountKind: session.role === "FIRMA" ? account.company?.kind || "firma" : "",
      companyName: account.company?.name || "",
      unread,
      openQa,
      pendingAccounts,
      pendingPanels: proposals.panels,
      pendingTalks: proposals.talks,
      pendingEvents: proposals.events,
      pendingCompliance,
      pendingGameSponsors,
      pendingSpeakers,
      pendingAmbassadors,
    }),
  );
}
