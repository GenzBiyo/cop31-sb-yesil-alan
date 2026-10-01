import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { COOKIE, sessionSecret } from "@/lib/session-cookie";
import { sbCanSee } from "@/lib/access";

const PUBLIC = [
  "/login",
  "/kayit",
  "/elci",
  "/giris",
  "/kesfet",
  "/ekran",
  "/paydas-formu",
  "/COP31saglikbakanligi",
  "/cop31saglikbakanligi",
  "/p",
  "/g",
  "/solaklar",
  "/e",
  "/oyun",
  "/u",
  "/sw.js",
  "/manifest.webmanifest",
  "/icons",
  "/api/app",
  "/api/public",
  "/api/qr",
  "/api/auth/login",
  "/api/auth/register",
  "/api/calendar",
  "/api/ambassador/form",
  "/api/ambassador/apply",
  "/_next",
  "/favicon.ico",
  "/fonts",
  "/gate",
  "/hatira",
  "/uploads",
];

function isPublic(pathname: string) {
  if (pathname === "/") return true;
  return PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

async function roleOf(token: string) {
  try {
    const { payload } = await jwtVerify(token, sessionSecret());
    return String(payload.role || "");
  } catch {
    return "";
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname) || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }
  const token = req.cookies.get(COOKIE)?.value;
  if (token) {
    if (!pathname.startsWith("/api/") && !sbCanSee(pathname) && (await roleOf(token)) === "SAGLIK") {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  const nextPath = `${pathname}${req.nextUrl.search || ""}`;
  url.search = "";
  if (pathname.startsWith("/sunucu") || pathname.startsWith("/oyunlar")) {
    url.pathname = "/giris/bakanlik";
    url.searchParams.set("next", nextPath);
    return NextResponse.redirect(url);
  }
  url.pathname = "/";
  if (pathname !== "/") url.searchParams.set("next", nextPath);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|gate/|hatira/|brand/|kilo/|fonts/|uploads/).*)"],
};
