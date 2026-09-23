import { jsonError, jsonOk } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { ensureEvents } from "@/lib/events-db";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  await ensureEvents();
  const { slug } = await ctx.params;
  const event = await prisma.pavilionEvent.findUnique({ where: { slug } });
  if (!event || !event.published) return jsonError("Etkinlik yok", 404);
  const config = JSON.parse(event.config || "{}") as Record<string, unknown>;
  if (Array.isArray(config.questions)) {
    config.questions = (config.questions as { q: string; options: string[]; answer?: number }[]).map((q) => ({
      q: q.q,
      options: q.options,
    }));
  }
  return jsonOk({ ...event, config });
}
