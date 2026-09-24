import { prisma } from "@/lib/prisma";
import { jsonOk } from "@/lib/api";
import { tickAgendaReminders } from "@/lib/agenda";

export async function GET() {
  await tickAgendaReminders();
  return jsonOk({ ok: true });
}
