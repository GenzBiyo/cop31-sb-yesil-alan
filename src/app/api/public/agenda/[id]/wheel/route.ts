import { jsonError, jsonOk } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { validEmail } from "@/lib/agenda-time";
import { claimJoinWheel } from "@/lib/once-wheel";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  if (!validEmail(email)) return jsonError("Geçerli e-posta gerekli");
  const signup = await prisma.agendaSignup.findUnique({ where: { agendaId_email: { agendaId: id, email } } });
  if (!signup) return jsonError("Önce etkinliğe katılın", 403);
  try {
    return jsonOk(await claimJoinWheel(id, email, signup.fullName));
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Çark açılamadı");
  }
}
