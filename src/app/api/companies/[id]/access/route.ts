import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { broadcast } from "@/lib/realtime";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Sets the company login (e-posta as kullanıcı adı) and password. */
export async function PUT(req: NextRequest, ctx: Ctx) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (user.role !== "ADMIN") return jsonError("Yetkiniz yok", 403);
  const { id } = await ctx.params;
  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) return jsonError("Kurum bulunamadı", 404);

  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "").trim();
  const name = String(body.name || "").trim();
  if (!email.includes("@")) return jsonError("Kullanıcı adı olarak geçerli bir e-posta girin");

  const taken = await prisma.user.findUnique({ where: { email } });
  const existing = await prisma.user.findFirst({
    where: { companyId: company.id, role: "FIRMA" },
    orderBy: { createdAt: "asc" },
  });
  if (taken && taken.id !== existing?.id) return jsonError("Bu kullanıcı adı başka bir hesapta kayıtlı");

  if (!existing && password.length < 8) return jsonError("Yeni hesap için şifre en az 8 karakter olmalı");
  if (password && password.length < 8) return jsonError("Şifre en az 8 karakter olmalı");

  const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;
  const saved = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: {
          email,
          ...(name ? { name } : {}),
          ...(passwordHash ? { passwordHash } : {}),
          accountStatus: "Onaylandı",
        },
      })
    : await prisma.user.create({
        data: {
          email,
          name: name || company.contactName || company.name,
          passwordHash: passwordHash!,
          role: "FIRMA",
          phone: company.contactPhone,
          title: company.kind === "konusmaci" ? "Konuşmacı" : "Kurum yetkilisi",
          accountStatus: "Onaylandı",
          companyId: company.id,
        },
      });

  await prisma.company.update({
    where: { id: company.id },
    data: { contactEmail: saved.email, contactName: saved.name, status: "Onaylandı" },
  });
  broadcast({ type: "account" });
  return jsonOk({ id: saved.id, email: saved.email, name: saved.name, passwordSet: Boolean(password) });
}
