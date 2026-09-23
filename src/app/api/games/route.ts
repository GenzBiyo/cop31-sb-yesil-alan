import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { ensureSampleGames, expireIfNeeded, gameBoard, parseOptions, questionResults, remainingSec, slugify } from "@/lib/games";
import { SAMPLE_WHEEL, describeWheel } from "@/lib/wheel";
import { SAMPLE_MATCH } from "@/lib/match-cards";
import { SAMPLE_KILO } from "@/lib/kilo-carbon";
import { SAMPLE_HATIRA, parseHatiraLogos } from "@/lib/hatira";
import { snapshotMatch } from "@/lib/match-live";
import { snapshotKilo } from "@/lib/kilo-live";
import { snapshotHatira } from "@/lib/hatira-live";

export async function GET(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  await ensureSampleGames();
  const slug = req.nextUrl.searchParams.get("slug");
  if (slug) {
    const raw = await prisma.game.findUnique({
      where: { slug },
      include: {
        questions: { orderBy: { order: "asc" } },
        slices: { orderBy: { order: "asc" } },
        teams: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!raw) return jsonError("Oyun yok", 404);
    const game = (await expireIfNeeded(raw.id)) || raw;
    const q = game.currentIndex >= 0 ? raw.questions[game.currentIndex] : null;
    const showReveal = game.phase === "reveal" || game.phase === "closed";
    const results = q ? await questionResults(game.id, q.id) : null;
    const pending = await prisma.gamePlayer.findMany({
      where: { gameId: game.id, status: "pending" },
      orderBy: { createdAt: "asc" },
      select: { id: true, nickname: true, createdAt: true, photoPath: true },
    });
    const roster = await prisma.gamePlayer.findMany({
      where: { gameId: game.id, status: "approved" },
      orderBy: { createdAt: "asc" },
      select: { id: true, nickname: true, score: true, photoPath: true },
    });
    const spinPlayer = game.lockedTeamId
      ? await prisma.gamePlayer.findUnique({ where: { id: game.lockedTeamId }, select: { id: true, nickname: true } })
      : null;
    const landed = raw.type === "wheel" && game.currentIndex >= 0 ? raw.slices[game.currentIndex] || null : null;
    const wheel = describeWheel({ ...game, type: raw.type, spinAngle: game.spinAngle ?? raw.spinAngle });
    return jsonOk({
      ...raw,
      status: game.status,
      phase: game.phase,
      currentIndex: game.currentIndex,
      view: game.view,
      seconds: game.seconds,
      remaining: remainingSec(game),
      paused: Boolean(game.pausedAt),
      questionStartedAt: game.questionStartedAt,
      spinAngle: game.spinAngle ?? raw.spinAngle,
      wheelMode: wheel.mode,
      spinFrom: wheel.from,
      slices: raw.slices,
      spinPlayer,
      landed: landed ? { label: landed.label, kind: landed.kind, color: landed.color } : null,
      questions: raw.questions.map((row) => ({
        id: row.id,
        prompt: row.prompt,
        options: parseOptions(row.options),
        answer: row.answer,
        points: row.points,
        seconds: row.seconds,
        videoUrl: row.videoUrl,
        videoPath: row.videoPath,
      })),
      current: q
        ? {
            id: q.id,
            index: game.currentIndex,
            prompt: q.prompt,
            options: parseOptions(q.options),
            points: q.points,
            seconds: q.seconds,
            videoUrl: q.videoUrl,
            videoPath: q.videoPath,
            answer: showReveal ? q.answer : null,
          }
        : null,
      results,
      pending,
      roster,
      board: await gameBoard(game.id),
      match: raw.type === "match" ? snapshotMatch(game.id) : null,
      kilo: raw.type === "kilo" ? snapshotKilo(game.id) : null,
      hatira: raw.type === "hatira" ? await snapshotHatira(game.id) : null,
      logos: raw.type === "hatira" ? parseHatiraLogos(raw.logoPath) : null,
    });
  }
  const games = await prisma.game.findMany({
    include: {
      _count: { select: { questions: true, players: true, teams: true, slices: true } },
      players: { where: { winner: true }, select: { nickname: true, score: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return jsonOk(games);
}

export async function POST(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const body = await req.json();
  const rawType = String(body.type || "quiz");
  const type = rawType === "wheel" || rawType === "match" || rawType === "kilo" || rawType === "hatira" ? rawType : "quiz";
  const defaults =
    type === "wheel"
      ? { title: "Hediyeli Çark", slug: "hediye-carki", gift: SAMPLE_WHEEL.gift, description: SAMPLE_WHEEL.description, seconds: 6 }
      : type === "match"
        ? { title: SAMPLE_MATCH.title, slug: SAMPLE_MATCH.slug, gift: SAMPLE_MATCH.gift, description: SAMPLE_MATCH.description, seconds: SAMPLE_MATCH.seconds }
        : type === "kilo"
          ? { title: SAMPLE_KILO.title, slug: SAMPLE_KILO.slug, gift: SAMPLE_KILO.gift, description: SAMPLE_KILO.description, seconds: SAMPLE_KILO.seconds }
        : type === "hatira"
          ? { title: SAMPLE_HATIRA.title, slug: SAMPLE_HATIRA.slug, gift: SAMPLE_HATIRA.gift, description: SAMPLE_HATIRA.description, seconds: SAMPLE_HATIRA.seconds }
        : { title: "Yeni soru-cevap", slug: "soru-cevap", gift: "Birinci ödül: COP31 Sağlık Pavilionu hediye seti", description: "", seconds: 15 };
  const base = slugify(String(body.slug || body.title || defaults.slug));
  let slug = base;
  let n = 1;
  while (await prisma.game.findUnique({ where: { slug } })) {
    slug = `${base}-${++n}`;
  }
  const game = await prisma.game.create({
    data: {
      slug,
      title: String(body.title || defaults.title).trim(),
      type,
      description: String(body.description || defaults.description).trim(),
      gift: String(body.gift || defaults.gift).trim(),
      location: String(body.location || "Sağlık Pavilionu — Etkileşim alanı").trim(),
      status: "draft",
      published: body.published !== false,
      seconds: defaults.seconds,
      slices:
        type === "wheel"
          ? {
              create: SAMPLE_WHEEL.slices.map((s, i) => ({
                order: i,
                label: s.label,
                color: s.color,
                kind: s.kind,
              })),
            }
          : undefined,
    },
  });
  return jsonOk(game, 201);
}
