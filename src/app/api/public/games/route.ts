import { jsonOk } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { ensureSampleGames } from "@/lib/games";
import { liveSponsors } from "@/lib/game-sponsors";
import { memoGet, memoSet } from "@/lib/memo";

const FRESH = { "Cache-Control": "public, max-age=4, stale-while-revalidate=20" };

const SELECT = {
  id: true,
  slug: true,
  title: true,
  description: true,
  gift: true,
  location: true,
  status: true,
  type: true,
  _count: { select: { players: true, questions: true, slices: true } },
} as const;

export async function GET() {
  await ensureSampleGames();
  const cached = memoGet<{ games: unknown[] }>("public-games", 4000);
  if (cached) return jsonOk(cached, 200, FRESH);

  const where = { published: true, status: { not: "draft" } };
  let games = await prisma.game.findMany({ where, select: SELECT, orderBy: { createdAt: "desc" } });
  if (games.length === 0) {
    await ensureSampleGames();
    games = await prisma.game.findMany({ where, select: SELECT, orderBy: { createdAt: "desc" } });
  }
  const sponsors = await liveSponsors();
  const body = {
    games: games.map(({ id, ...g }) => ({ ...g, sponsor: sponsors[id] || null })),
  };
  memoSet("public-games", body);
  return jsonOk(body, 200, FRESH);
}
