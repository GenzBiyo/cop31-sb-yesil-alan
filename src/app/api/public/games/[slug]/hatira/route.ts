import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api";
import { newPlayerToken, parsePlayerMap, PLAYER_COOKIE } from "@/lib/games";
import { touchGame } from "@/lib/game-live";

export const runtime = "nodejs";

const MAX = 4 * 1024 * 1024;

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const game = await prisma.game.findUnique({ where: { slug }, select: { id: true, type: true, published: true, status: true } });
  if (!game || !game.published) return jsonError("Oyun yok", 404);
  if (game.type !== "hatira") return jsonError("Bu oyun hatıra değil");
  if (game.status === "draft" || game.status === "closed") return jsonError("Hatıra şu an kapalı");

  const form = await req.formData();
  const file = form.get("photo");
  if (!(file instanceof File)) return jsonError("Fotoğraf yok");
  if (file.size > MAX) return jsonError("Fotoğraf en fazla 4 MB olabilir");
  const type = file.type || "";
  if (!type.startsWith("image/")) return jsonError("JPEG veya PNG gönderin");

  const jar = await cookies();
  const map = parsePlayerMap(jar.get(PLAYER_COOKIE)?.value);
  const existing = map[game.id]
    ? await prisma.gamePlayer.findUnique({ where: { token: map[game.id] } })
    : null;

  const buf = Buffer.from(await file.arrayBuffer());
  const dir = path.join(process.cwd(), "public", "uploads", "hatira");
  await mkdir(dir, { recursive: true });
  const filename = `${game.id}-${existing?.id || newPlayerToken().slice(0, 12)}.jpg`;
  await writeFile(path.join(dir, filename), buf);
  const photoPath = `/uploads/hatira/${filename}?t=${Date.now()}`;

  if (existing) {
    const player = await prisma.gamePlayer.update({
      where: { id: existing.id },
      data: { photoPath, status: "pending" },
    });
    touchGame(true);
    return jsonOk({ id: player.id, status: player.status, photoPath: player.photoPath });
  }

  const token = newPlayerToken();
  const nickname = `Hatira ${token.slice(-5)}`;
  const player = await prisma.gamePlayer.create({
    data: { gameId: game.id, nickname, token, status: "pending", photoPath },
  });
    map[game.id] = token;
    jar.set(PLAYER_COOKIE, JSON.stringify(map), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 21,
    });
  touchGame(true);
  return jsonOk({ id: player.id, status: player.status, photoPath: player.photoPath }, 201);
}
