import { cookies } from "next/headers";
import { jsonError, jsonOk } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getSharedGame } from "@/lib/game-live";
import { parsePlayerMap, PLAYER_COOKIE } from "@/lib/games";
import { playerMatchView } from "@/lib/match-live";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const play = new URL(req.url).searchParams.get("play") === "1";
  const shared = await getSharedGame(slug, !play);
  if (!shared) return jsonError("Oyun yok", 404);

  const jar = await cookies();
  const token = parsePlayerMap(jar.get(PLAYER_COOKIE)?.value)[shared.id];
  const me = token
    ? await prisma.gamePlayer.findUnique({
        where: { token },
        select: {
          id: true,
          gameId: true,
          nickname: true,
          score: true,
          winner: true,
          teamId: true,
          status: true,
          photoPath: true,
          team: { select: { name: true, color: true } },
          answers: shared.question
            ? { where: { questionId: shared.question.id }, take: 1, select: { choice: true, correct: true } }
            : { take: 0 },
        },
      })
    : null;
  const mine = me && me.gameId === shared.id ? me : null;
  const ans = mine && "answers" in mine && Array.isArray(mine.answers) ? mine.answers[0] : null;
  const showReveal = shared.phase === "reveal" || shared.phase === "closed";

  const matchBoard = mine && shared.type === "match" && shared.phase === "asking" ? playerMatchView(shared.id, mine.id) : null;
  return jsonOk({
    slug: shared.slug,
    title: shared.title,
    description: shared.description,
    gift: shared.gift,
    location: shared.location,
    status: shared.status,
    phase: shared.phase,
    view: shared.view,
    type: shared.type,
    currentIndex: shared.currentIndex,
    total: shared.total,
    seconds: shared.seconds,
    remaining: shared.remaining,
    paused: shared.paused,
    questionStartedAt: shared.questionStartedAt,
    spinAngle: shared.spinAngle,
    wheelMode: shared.wheelMode,
    spinFrom: shared.spinFrom,
    slices: shared.slices,
    spinPlayer: shared.spinPlayer,
    landed: shared.landed,
    teams: shared.teams,
    question: shared.question,
    me: mine
      ? {
          id: mine.id,
          nickname: mine.nickname,
          score: mine.score,
          winner: mine.winner,
          teamId: mine.teamId,
          teamName: mine.team?.name || "",
          teamColor: mine.team?.color || "#22A34A",
          choice: ans ? ans.choice : null,
          correct: showReveal && ans ? ans.correct : null,
          answered: Boolean(ans),
          status: mine.status,
          photoPath: mine.photoPath,
        }
      : null,
    results: shared.results,
    board: shared.board || { players: [], teams: [] },
    winner: shared.winner,
    match: shared.match,
    matchBoard,
    kilo: shared.kilo,
    hatira: shared.hatira,
    logos: shared.logos,
    plak: shared.plak,
  });
}
