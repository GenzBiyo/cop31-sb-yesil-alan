import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api";
import {
  AMBASSADOR_PASSWORD,
  findAcceptedAmbassador,
  setElciCookie,
  signElci,
} from "@/lib/ambassador-access";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!email || !password) return jsonError("E-posta ve şifre gerekli");
  if (password !== AMBASSADOR_PASSWORD) return jsonError("E-posta veya şifre hatalı", 401);
  const accepted = await findAcceptedAmbassador(email);
  if (!accepted) return jsonError("Bu başvuru henüz kabul edilmedi.", 403);
  const token = await signElci({ id: accepted.id, email: accepted.email, name: accepted.fullName });
  await setElciCookie(token);
  return jsonOk({ id: accepted.id, email: accepted.email, name: accepted.fullName });
}
