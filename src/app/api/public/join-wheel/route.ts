import { jsonError, jsonOk } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { validEmail } from "@/lib/agenda-time";
import { claimJoinWheel } from "@/lib/once-wheel";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const refId = String(body.refId || "");
  const fullName = String(body.fullName || "").trim();
  if (!validEmail(email)) return jsonError("Geçerli e-posta gerekli");
  if (!refId) return jsonError("Etkinlik gerekli");

  const agenda = await prisma.agendaSignup.findUnique({ where: { agendaId_email: { agendaId: refId, email } } });
  if (agenda) {
    try {
      return jsonOk(await claimJoinWheel(refId, email, fullName || agenda.fullName));
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "Çark açılamadı");
    }
  }

  const visitor = await prisma.visitor.findFirst({ where: { email }, select: { id: true, fullName: true } });
  const signup = visitor
    ? await prisma.eventSignup.findFirst({ where: { eventId: refId, visitorId: visitor.id }, select: { id: true } })
    : null;
  if (!signup) return jsonError("Önce etkinliğe katılın", 403);
  try {
    return jsonOk(await claimJoinWheel(refId, email, fullName || visitor?.fullName || ""));
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Çark açılamadı");
  }
}
