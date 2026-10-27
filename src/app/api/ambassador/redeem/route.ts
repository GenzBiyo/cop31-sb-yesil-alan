import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api";
import { readElci } from "@/lib/ambassador-access";
import { redeemPrize } from "@/lib/prize-redeem";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const elci = await readElci();
  if (!elci) return jsonError("Elçi girişi gerekli.", 401);
  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "").trim();
  if (!id) return jsonError("Kod gerekli");
  const view = await redeemPrize(id, elci);
  if (!view) return jsonError("Kod bulunamadı", 404);
  return jsonOk(view);
}
