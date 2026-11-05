import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest } from "next/server";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { isAdmin } from "@/lib/auth";
import { cardBackgrounds, isCardSlot, resetCardBackground, saveCardBackground } from "@/lib/card-backgrounds";

export const runtime = "nodejs";

const MAX = 8 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!isAdmin(user.role)) return jsonError("Yetkiniz yok", 403);

  const form = await req.formData();
  const slot = String(form.get("slot") || "");
  if (!isCardSlot(slot)) return jsonError("Kart seçin");
  if (String(form.get("reset") || "") === "1") {
    await resetCardBackground(slot);
    return jsonOk({ slots: await cardBackgrounds() });
  }

  const file = form.get("file");
  if (!(file instanceof File)) return jsonError("Görsel seçin");
  if (file.size > MAX) return jsonError("Görsel en fazla 8 MB olabilir");
  const type = file.type || "";
  if (!type.startsWith("image/") && !/\.(png|jpe?g|webp)$/i.test(file.name)) {
    return jsonError("JPG, PNG veya WebP yükleyin");
  }
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const safeExt = ext === "png" || ext === "webp" || ext === "jpeg" ? ext : "jpg";
  const dir = path.join(process.cwd(), "public", "uploads", "cards");
  await mkdir(dir, { recursive: true });
  const filename = `${slot}.${safeExt === "jpeg" ? "jpg" : safeExt}`;
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
  await saveCardBackground(slot, `/uploads/cards/${filename}?t=${Date.now()}`);
  return jsonOk({ slots: await cardBackgrounds() });
}
