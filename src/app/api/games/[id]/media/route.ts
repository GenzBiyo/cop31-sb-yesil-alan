import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { touchGame } from "@/lib/game-live";
import { mergeHatiraLogos } from "@/lib/hatira";

export const runtime = "nodejs";

const MAX_VIDEO = 40 * 1024 * 1024;
const MAX_LOGO = 4 * 1024 * 1024;

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const { id } = await ctx.params;
  const game = await prisma.game.findUnique({ where: { id }, select: { id: true, logoPath: true } });
  if (!game) return jsonError("Oyun yok", 404);

  const form = await req.formData();
  const kind = String(form.get("kind") || "video");
  const file = form.get("file");

  if (kind === "logo") {
    const slot = String(form.get("slot") || "") === "saglik" ? "saglik" : "cop31";
    if (!(file instanceof File)) return jsonError("Logo dosyası seçin");
    if (file.size > MAX_LOGO) return jsonError("Logo en fazla 4 MB olabilir");
    const type = file.type || "";
    if (!type.startsWith("image/") && !/\.(png|jpe?g|webp|svg)$/i.test(file.name)) {
      return jsonError("PNG, JPG veya WebP yükleyin");
    }
    const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
    const dir = path.join(process.cwd(), "public", "uploads", "hatira", "logos");
    await mkdir(dir, { recursive: true });
    const filename = `${id}-${slot}.${ext}`;
    await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
    const publicPath = `/uploads/hatira/logos/${filename}?t=${Date.now()}`;
    const logos = mergeHatiraLogos(game.logoPath, { [slot]: publicPath });
    await prisma.game.update({ where: { id }, data: { logoPath: JSON.stringify(logos) } });
    touchGame(true);
    return jsonOk({ logos });
  }

  const questionId = String(form.get("questionId") || "");
  if (!questionId) return jsonError("Önce soruyu kaydedin, sonra video yükleyin");
  const question = await prisma.gameQuestion.findFirst({ where: { id: questionId, gameId: id } });
  if (!question) return jsonError("Soru yok", 404);
  if (!(file instanceof File)) return jsonError("Video dosyası seçin");
  if (file.size > MAX_VIDEO) return jsonError("Video en fazla 40 MB olabilir. Daha büyükse YouTube bağlantısı kullanın");
  const type = file.type || "";
  if (!type.startsWith("video/") && !/\.(mp4|webm|mov)$/i.test(file.name)) {
    return jsonError("MP4 veya WebM yükleyin");
  }
  const ext = (file.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
  const dir = path.join(process.cwd(), "public", "uploads", "games");
  await mkdir(dir, { recursive: true });
  const filename = `${id}-${questionId}.${ext}`;
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
  const videoPath = `/uploads/games/${filename}`;
  await prisma.gameQuestion.update({ where: { id: question.id }, data: { videoPath } });
  touchGame(true);
  return jsonOk({ id: question.id, videoPath });
}
