import { jsonOk } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { ensureSampleGames } from "@/lib/games";
import { memoGet, memoSet } from "@/lib/memo";

const FRESH = { "Cache-Control": "public, max-age=4, stale-while-revalidate=20" };

export async function GET() {
  await ensureSampleGames();
  const cached = memoGet<{ games: unknown[] }>("public-games", 4000);
  if (cached) return jsonOk(cached, 200, FRESH);

  let games = await prisma.game.findMany({
    where: { published: true, status: { not: "draft" } },
    select: {
      slug: true,
      title: true,
      description: true,
      gift: true,
      location: true,
      status: true,
      type: true,
      _count: { select: { players: true, questions: true, slices: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  if (games.length === 0) {
    await ensureSampleGames();
    games = await prisma.game.findMany({
      where: { published: true, status: { not: "draft" } },
      select: {
        slug: true,
        title: true,
        description: true,
        gift: true,
        location: true,
        status: true,
        type: true,
        _count: { select: { players: true, questions: true, slices: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }
  const body = { games };
  memoSet("public-games", body);
  return jsonOk(body, 200, FRESH);
}
