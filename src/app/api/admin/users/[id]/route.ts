import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { broadcast } from "@/lib/realtime";
import { applyAccountStatus, tempPassword, USER_SELECT } from "@/lib/accounts";
import { ACCOUNT_STATUSES, validKind } from "@/lib/account-kinds";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (user.role !== "ADMIN") return jsonError("Yetkiniz yok", 403);
  const { id } = await ctx.params;
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return jsonError("Hesap yok", 404);
  const self = target.id === user.id;
  const body = await req.json().catch(() => ({}));

  if (body.accountStatus != null) {
    const status = String(body.accountStatus);
    if (!(ACCOUNT_STATUSES as readonly string[]).includes(status)) return jsonError("Geçersiz durum");
    if (self) return jsonError("Kendi hesabınızın durumunu değiştiremezsiniz");
    await applyAccountStatus(id, status, body.message ? String(body.message) : undefined);
  }

  const data: { name?: string; title?: string; phone?: string; email?: string; role?: string; passwordHash?: string } = {};
  if (body.name != null) {
    const name = String(body.name).trim();
    if (!name) return jsonError("Ad soyad gerekli");
    data.name = name;
  }
  if (body.title != null) data.title = String(body.title).trim().slice(0, 120);
  if (body.phone != null) data.phone = String(body.phone).trim().slice(0, 40);
  if (body.email != null) {
    const email = String(body.email).trim().toLowerCase();
    if (!email.includes("@")) return jsonError("Geçerli bir e-posta girin");
    const taken = await prisma.user.findUnique({ where: { email } });
    if (taken && taken.id !== id) return jsonError("Bu e-posta başka bir hesapta kayıtlı");
    data.email = email;
  }
  if (body.role != null) {
    if (self) return jsonError("Kendi rolünüzü değiştiremezsiniz");
    if (target.role === "FIRMA" || !["ADMIN", "SAGLIK"].includes(String(body.role))) {
      return jsonError("Rol yalnızca Admin ve Sağlık Bakanlığı kullanıcıları arasında değişir");
    }
    data.role = String(body.role);
  }
  let password = "";
  if (body.resetPassword) {
    password = String(body.newPassword || "").trim() || tempPassword();
    if (password.length < 8) return jsonError("Şifre en az 8 karakter olmalı");
    data.passwordHash = await bcrypt.hash(password, 10);
  }
  if (Object.keys(data).length) await prisma.user.update({ where: { id }, data });

  if (target.companyId && (body.kind != null || body.orgName != null || body.participationDates != null)) {
    await prisma.company.update({
      where: { id: target.companyId },
      data: {
        ...(body.kind != null ? { kind: validKind(body.kind) } : {}),
        ...(body.orgName != null && String(body.orgName).trim() ? { name: String(body.orgName).trim() } : {}),
        ...(body.participationDates != null ? { participationDates: String(body.participationDates).slice(0, 80) } : {}),
      },
    });
  }

  broadcast({ type: "account" });
  const updated = await prisma.user.findUnique({ where: { id }, select: USER_SELECT });
  return jsonOk({ user: updated, password: password || undefined });
}
