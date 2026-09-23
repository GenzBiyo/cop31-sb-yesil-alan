import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api";
import { newPlayerToken, parsePlayerMap, PLAYER_COOKIE } from "@/lib/games";
import { touchGame } from "@/lib/game-live";

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const game = await prisma.game.findUnique({ where: { slug } });
  if (!game || !game.published) return jsonError("Oyun yok", 404);
  if (game.status === "draft") return jsonError("Oyun henüz açılmadı");
  if (game.status === "closed") return jsonError("Oyun kapandı, yeni rumuz alınmıyor");

  const body = await req.json();
  const nickname = String(body.nickname || "").trim().replace(/\s+/g, " ");
  if (nickname.length < 2 || nickname.length > 20) return jsonError("Rumuz 2–20 karakter olmalı");

  const jar = await cookies();
  const map = parsePlayerMap(jar.get(PLAYER_COOKIE)?.value);
  const existing = map[game.id]
    ? await prisma.gamePlayer.findUnique({ where: { token: map[game.id] } })
    : null;

  const taken = await prisma.gamePlayer.findFirst({
    where: {
      gameId: game.id,
      nickname,
      ...(existing ? { id: { not: existing.id } } : {}),
    },
  });
  if (taken) return jsonError("Bu rumuz dolu, başka bir rumuz seçin");

  if (existing) {
    if (existing.status === "approved") {
      return jsonOk({ id: existing.id, nickname: existing.nickname, status: existing.status });
    }
    if (existing.status === "pending") {
      return jsonOk({ id: existing.id, nickname: existing.nickname, status: existing.status, waiting: true });
    }
    const player = await prisma.gamePlayer.update({
      where: { id: existing.id },
      data: { nickname, status: "pending" },
    });
    touchGame(true);
    return jsonOk({ id: player.id, nickname: player.nickname, status: player.status });
  }

  const token = newPlayerToken();
  try {
    const player = await prisma.gamePlayer.create({
      data: { gameId: game.id, nickname, token, status: "pending" },
    });
    map[game.id] = token;
    jar.set(PLAYER_COOKIE, JSON.stringify(map), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 21,
    });
    touchGame(true);
    return jsonOk({ id: player.id, nickname: player.nickname, status: player.status }, 201);
  } catch {
    return jsonError("Bu rumuz dolu, başka bir rumuz seçin");
  }
}
