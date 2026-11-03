import { cookies } from "next/headers";
import { clearSessionCookie } from "@/lib/auth";
import { jsonOk } from "@/lib/api";
import { ELCI_COOKIE } from "@/lib/ambassador-access";

export async function POST() {
  await clearSessionCookie();
  (await cookies()).set(ELCI_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return jsonOk({ ok: true });
}
