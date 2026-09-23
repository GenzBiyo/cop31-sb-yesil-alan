import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api";
import { pushKilo } from "@/lib/kilo-live";
import { touchGame } from "@/lib/game-live";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const game = await prisma.game.findUnique({
    where: { slug },
    select: { id: true, type: true, published: true },
  });
  if (!game || !game.published) return jsonError("Oyun yok", 404);
  if (game.type !== "kilo") return jsonError("Bu oyun kilo hesabı değil");
  const body = await req.json().catch(() => ({}));
  const out = pushKilo(game.id, body);
  if ("error" in out) return jsonError(out.error);
  touchGame(false);
  return jsonOk({ result: out.result, pulse: out.pulse });
}
