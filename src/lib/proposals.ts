import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";
import { broadcast } from "@/lib/realtime";

export const PENDING = "Onay bekliyor";
export const APPROVED = "Onaylandı";
export const REJECTED = "Reddedildi";

export function isPendingStatus(status?: string | null) {
  return status === PENDING;
}

async function sbUsers() {
  const sb = await prisma.user.findMany({ where: { role: "SAGLIK" } });
  if (sb.length) return sb;
  return prisma.user.findMany({ where: { role: "ADMIN" } });
}

export async function notifySbProposal(opts: {
  title: string;
  body: string;
  href: string;
}) {
  const staff = await sbUsers();
  for (const u of staff) {
    await prisma.inboxItem.create({
      data: { userId: u.id, title: opts.title, body: `${opts.body}\n${opts.href}` },
    });
    await sendMail(u.email, opts.title, `${opts.body}\n\nHazırlık masası: ${opts.href}`);
  }
  broadcast({ type: "inbox" });
}

export async function notifyCompanyDecision(opts: {
  proposedById?: string;
  companyId?: string;
  title: string;
  body: string;
}) {
  const users = opts.proposedById
    ? await prisma.user.findMany({ where: { id: opts.proposedById } })
    : opts.companyId
      ? await prisma.user.findMany({ where: { companyId: opts.companyId, role: "FIRMA" } })
      : [];
  for (const u of users) {
    await prisma.inboxItem.create({
      data: { userId: u.id, title: opts.title, body: opts.body },
    });
    await sendMail(u.email, opts.title, opts.body);
  }
  broadcast({ type: "inbox" });
}

export async function pendingProposalCounts() {
  const [panels, events] = await Promise.all([
    prisma.panel.count({ where: { status: PENDING } }),
    prisma.pavilionEvent.count({ where: { approvalStatus: PENDING } }),
  ]);
  return { panels, events, total: panels + events };
}
