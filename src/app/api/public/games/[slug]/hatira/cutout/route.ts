import { NextRequest } from "next/server";
import { jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX = 6 * 1024 * 1024;

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const game = await prisma.game.findUnique({ where: { slug }, select: { type: true, published: true } });
  if (!game || !game.published || game.type !== "hatira") return jsonError("Oyun yok", 404);

  const form = await req.formData();
  const file = form.get("photo");
  if (!(file instanceof File)) return jsonError("Fotoğraf yok");
  if (file.size > MAX) return jsonError("Fotoğraf çok büyük");

  const buf = Buffer.from(await file.arrayBuffer());
  try {
    const { removeBackground } = await import("@imgly/background-removal-node");
    const blob = await removeBackground(buf, {
      model: "medium",
      output: { format: "image/png", quality: 0.92 },
    });
    const png = Buffer.from(await blob.arrayBuffer());
    return new Response(png, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Arka plan temizlenemedi";
    return jsonError(msg, 500);
  }
}
