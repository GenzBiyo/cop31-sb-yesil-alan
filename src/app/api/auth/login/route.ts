import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setSessionCookie, signSession, type Role } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) return jsonError("E-posta ve şifre gerekli");
  const user = await prisma.user.findUnique({ where: { email: String(email).trim().toLowerCase() } });
  if (!user) return jsonError("E-posta veya şifre hatalı", 401);
  const ok = await bcrypt.compare(String(password), user.passwordHash);
  if (!ok) return jsonError("E-posta veya şifre hatalı", 401);
  if (user.accountStatus === "Beklemede") {
    return jsonError("Hesabınız admin onayını bekliyor. Onay maili e-posta adresinize düşecektir.", 403);
  }
  if (user.accountStatus === "Reddedildi") {
    return jsonError("Hesap başvurunuz onaylanmadı. Sağlık Pavilionu ekibiyle iletişime geçin.", 403);
  }
  const token = await signSession({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    companyId: user.companyId,
    title: user.title,
  });
  await setSessionCookie(token);
  return jsonOk({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    companyId: user.companyId,
    title: user.title,
  });
}
