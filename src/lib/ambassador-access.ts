import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import { prisma } from "./prisma";
import { sessionSecret } from "./session-cookie";
import { isAmbassadorAccepted } from "./ambassador-card";

export const AMBASSADOR_PASSWORD = "COP312026!";
export const ELCI_COOKIE = "cop31_elci";

/** Registration stays open through the end of 5 October 2026, Europe/Istanbul. */
export const AMBASSADOR_DEADLINE = new Date("2026-10-05T23:59:59+03:00");

export function ambassadorRegistrationOpen(now = new Date()) {
  return now.getTime() <= AMBASSADOR_DEADLINE.getTime();
}

export type ElciSession = { id: string; email: string; name: string };

export async function signElci(user: ElciSession) {
  return new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(sessionSecret());
}

export async function readElci(): Promise<ElciSession | null> {
  const token = (await cookies()).get(ELCI_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionSecret());
    const id = String(payload.id || "");
    const email = String(payload.email || "");
    if (!id || !email) return null;
    return { id, email, name: String(payload.name || "") };
  } catch {
    return null;
  }
}

export async function setElciCookie(token: string) {
  const h = await headers();
  const proto = (h.get("x-forwarded-proto") || "").split(",")[0].trim();
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  const https = proto === "https" || /ngrok|loca\.lt|trycloudflare/i.test(host);
  (await cookies()).set(ELCI_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: https,
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function findAcceptedAmbassador(email: string) {
  const mail = email.trim().toLowerCase();
  if (!mail.includes("@")) return null;
  const rows = await prisma.ambassadorApplication.findMany({
    where: { email: mail },
    orderBy: { updatedAt: "desc" },
  });
  return rows.find((row) => isAmbassadorAccepted(row.status)) || null;
}
