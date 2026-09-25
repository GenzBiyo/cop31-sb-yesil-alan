import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import { prisma } from "./prisma";
import { COOKIE } from "./session-cookie";

export type Role = "ADMIN" | "SAGLIK" | "FIRMA";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  companyId: string | null;
  title: string;
};

function secret() {
  return new TextEncoder().encode(
    process.env.AUTH_SECRET || "cop31-sb-hazirlik-secret-change-me"
  );
}

export async function signSession(user: SessionUser) {
  return new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secret());
}

export async function readSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const h = await headers();
  const proto = (h.get("x-forwarded-proto") || "").split(",")[0].trim();
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  const https = proto === "https" || /ngrok|loca\.lt|trycloudflare/i.test(host);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: https,
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(COOKIE);
}

export async function requireUser() {
  const session = await readSession();
  if (!session) {
    const err = new Error("UNAUTHORIZED");
    throw err;
  }
  return session;
}

export function canManage(role: Role) {
  return role === "ADMIN" || role === "SAGLIK";
}

export function isAdmin(role: Role) {
  return role === "ADMIN";
}

export async function hydrateUser(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: { company: true },
  });
}

export { COOKIE };
