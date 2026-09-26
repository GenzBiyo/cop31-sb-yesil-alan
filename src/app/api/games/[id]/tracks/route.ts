import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { describeTrack } from "@/lib/plak";
import { touchGame } from "@/lib/game-live";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await withUser();
  if (error || !user) return error;
  if (!canManage(user.role)) return jsonError("Yetki yok", 403);
  const { id } = await ctx.params;
  const game = await prisma.game.findUnique({ where: { id } });
  if (!game || game.type !== "plak") return jsonError("Müzik oyunu değil", 404);
  const body = await req.json().catch(() => ({}));
  try {
    const track = await describeTrack(String(body.url || ""));
    const count = await prisma.gameTrack.count({ where: { gameId: id } });
    const saved = await prisma.gameTrack.create({
      data: { gameId: id, order: count, ...track },
    });
    touchGame(true);
    return jsonOk(saved, 201);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Parça eklenemedi");
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await withUser();
  if (error || !user) return error;
  if (!canManage(user.role)) return jsonError("Yetki yok", 403);
  const { id } = await ctx.params;
  const trackId = new URL(req.url).searchParams.get("trackId") || "";
  await prisma.gameTrack.deleteMany({ where: { id: trackId, gameId: id } });
  touchGame(true);
  return jsonOk({ ok: true });
}
