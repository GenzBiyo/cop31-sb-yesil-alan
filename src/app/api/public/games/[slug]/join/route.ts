import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api";
import { newPlayerToken, parsePlayerMap, PLAYER_COOKIE } from "@/lib/games";
import { touchGame } from "@/lib/game-live";

function guestNick() {
  return `Oyuncu ${Math.floor(1000 + Math.random() * 9000)}`;
}

function setPlayerCookie(jar: Awaited<ReturnType<typeof cookies>>, map: Record<string, string>) {
  jar.set(PLAYER_COOKIE, JSON.stringify(map), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 21,
  });
}

export async function POST(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const game = await prisma.game.findUnique({ where: { slug } });
  if (!game || !game.published) return jsonError("Oyun yok", 404);
  if (game.status === "closed") return jsonError("Oyun kapandı");

  const jar = await cookies();
  const map = parsePlayerMap(jar.get(PLAYER_COOKIE)?.value);
  const existing = map[game.id]
    ? await prisma.gamePlayer.findUnique({ where: { token: map[game.id] } })
    : null;

  if (existing && existing.gameId === game.id) {
    if (existing.status === "approved") {
      return jsonOk({ id: existing.id, nickname: existing.nickname, status: existing.status });
    }
    const player = await prisma.gamePlayer.update({
      where: { id: existing.id },
      data: { status: "approved" },
    });
    touchGame(true);
    return jsonOk({ id: player.id, nickname: player.nickname, status: player.status });
  }

  const token = newPlayerToken();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const player = await prisma.gamePlayer.create({
        data: { gameId: game.id, nickname: guestNick(), token, status: "approved" },
      });
      map[game.id] = token;
      setPlayerCookie(jar, map);
      touchGame(true);
      return jsonOk({ id: player.id, nickname: player.nickname, status: player.status }, 201);
    } catch {
      /* nickname taken, try another */
    }
  }
  return jsonError("Oyun açılamadı, yeniden deneyin");
}
