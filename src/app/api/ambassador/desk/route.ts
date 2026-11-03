import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api";
import { readElci } from "@/lib/ambassador-access";
import { DeskError, actElci, loadElciDesk } from "@/lib/elci-desk";

export async function GET(req: NextRequest) {
  const elci = await readElci();
  if (!elci) return jsonError("Giriş gerekli", 401);
  const grup = req.nextUrl.searchParams.get("grup") || "";
  const yonetim = req.nextUrl.searchParams.get("yonetim") || "";
  const kisi = req.nextUrl.searchParams.get("kisi") || "";
  try {
    return jsonOk(await loadElciDesk(elci.id, { grup, yonetim, kisi }));
  } catch (err) {
    if (err instanceof DeskError) return jsonError(err.message, err.status);
    throw err;
  }
}

export async function POST(req: NextRequest) {
  const elci = await readElci();
  if (!elci) return jsonError("Giriş gerekli", 401);
  const body = await req.json().catch(() => ({}));
  try {
    return jsonOk(await actElci(elci.id, body));
  } catch (err) {
    if (err instanceof DeskError) return jsonError(err.message, err.status);
    throw err;
  }
}
