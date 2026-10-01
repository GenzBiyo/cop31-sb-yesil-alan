import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { ensureSampleGames } from "@/lib/games";
import { notifySbProposal } from "@/lib/proposals";
import { broadcast } from "@/lib/realtime";
import {
  findSponsorConflict,
  forgetLiveSponsors,
  SPONSOR_APPROVED,
  SPONSOR_PENDING,
  SPONSOR_REJECTED,
  sponsorReach,
  validateSponsorSlot,
} from "@/lib/game-sponsors";

export async function GET() {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (user.role === "FIRMA" && !user.companyId) return jsonError("Firma hesabı gerekli", 403);
  const manager = canManage(user.role);
  await ensureSampleGames();

  const [games, rows, companies] = await Promise.all([
    prisma.game.findMany({
      select: { id: true, title: true, type: true, slug: true, published: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.gameSponsorship.findMany({
      include: { company: { select: { id: true, name: true, logoPath: true } }, game: { select: { id: true, title: true, type: true, slug: true } } },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    }),
    manager ? prisma.company.findMany({ select: { id: true, name: true, logoPath: true }, orderBy: { name: "asc" } }) : Promise.resolve([]),
  ]);

  const mine = manager ? rows : rows.filter((r) => r.companyId === user.companyId);
  const reach = await sponsorReach(mine.filter((r) => r.status !== SPONSOR_REJECTED && r.status !== SPONSOR_PENDING));
  const taken = rows
    .filter((r) => r.status !== SPONSOR_REJECTED)
    .map((r) => ({ id: r.id, gameId: r.gameId, date: r.date, startTime: r.startTime, endTime: r.endTime }));

  return jsonOk({
    games: games.filter((g) => manager || g.published),
    companies,
    sponsorships: mine.map((r) => ({ ...r, reach: reach[r.id] || { players: 0, winners: 0 } })),
    taken,
  });
}

export async function POST(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const manager = canManage(user.role);
  if (!manager && user.role !== "FIRMA") return jsonError("Yetkiniz yok", 403);
  if (!manager && !user.companyId) return jsonError("Firma hesabı gerekli", 403);

  const body = await req.json();
  const companyId = manager ? String(body.companyId || "") : user.companyId!;
  const gameId = String(body.gameId || "");
  const date = String(body.date || "");
  const startTime = String(body.startTime || "");
  const endTime = String(body.endTime || "");

  const [game, company] = await Promise.all([
    prisma.game.findUnique({ where: { id: gameId } }),
    prisma.company.findUnique({ where: { id: companyId } }),
  ]);
  if (!game) return jsonError("Oyun seçin");
  if (!company) return jsonError("Sponsor firma seçin");
  const slotError = validateSponsorSlot({ date, startTime, endTime });
  if (slotError) return jsonError(slotError);
  const conflict = await findSponsorConflict({ gameId, date, startTime, endTime });
  if (conflict) {
    return jsonError(`Bu saat dolu: ${conflict.startTime}–${conflict.endTime}${manager ? ` (${conflict.company.name})` : ""}`);
  }

  const row = await prisma.gameSponsorship.create({
    data: {
      gameId,
      companyId,
      date,
      startTime,
      endTime,
      prize: String(body.prize || "").slice(0, 200),
      prizeQty: Math.max(0, Number(body.prizeQty) || 0),
      notes: String(body.notes || "").slice(0, 1000),
      status: manager ? SPONSOR_APPROVED : SPONSOR_PENDING,
      proposedById: manager ? "" : user.id,
    },
  });
  if (!manager) {
    await notifySbProposal({
      title: "Oyun sponsorluğu talebi",
      body: `${company.name}: ${game.title} · ${date} ${startTime}–${endTime}`,
      href: "/oyun-sponsorluk",
    });
  }
  forgetLiveSponsors();
  broadcast({ type: "agenda" });
  return jsonOk(row, 201);
}
