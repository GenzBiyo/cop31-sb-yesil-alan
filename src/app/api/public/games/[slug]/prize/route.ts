import { cookies } from "next/headers";
import { jsonError, jsonOk } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { parsePlayerMap, PLAYER_COOKIE } from "@/lib/games";
import { claimJoinWheel, wheelWho } from "@/lib/once-wheel";
import { deviceFromToken, validDeviceToken } from "@/lib/visitor-app";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const game = await prisma.game.findUnique({
    where: { slug },
    select: { id: true, published: true },
  });
  if (!game || !game.published) return jsonError("Oyun yok", 404);

  const jar = await cookies();
  const token = parsePlayerMap(jar.get(PLAYER_COOKIE)?.value)[game.id];
  let who = "";
  let name = "";
  if (token) {
    const player = await prisma.gamePlayer.findUnique({ where: { token } });
    if (player && player.gameId === game.id && player.status === "approved") {
      who = `player:${player.id}`;
      name = player.nickname;
    }
  }
  if (!who) {
    const deviceToken = (req.headers.get("x-cop31-device") || "").trim();
    if (!validDeviceToken(deviceToken)) return jsonError("Önce kayıt olun", 401);
    const device = await deviceFromToken(deviceToken);
    if (!device?.name || !device.email) return jsonError("Önce kayıt olun", 401);
    who = wheelWho(device.email, device.id);
    name = device.name;
  }

  try {
    return jsonOk(await claimJoinWheel(game.id, who, name));
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Çark açılamadı");
  }
}
