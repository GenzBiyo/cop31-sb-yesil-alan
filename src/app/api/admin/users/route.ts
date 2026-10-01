import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { slugify, STANDARD_RULES } from "@/lib/company";
import { broadcast } from "@/lib/realtime";
import { accountKind, validKind } from "@/lib/account-kinds";
import { tempPassword, USER_SELECT } from "@/lib/accounts";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (user.role !== "ADMIN") return jsonError("Yetkiniz yok", 403);
  const users = await prisma.user.findMany({ select: USER_SELECT, orderBy: { createdAt: "desc" } });
  return jsonOk({ users });
}

export async function POST(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (user.role !== "ADMIN") return jsonError("Yetkiniz yok", 403);
  const body = await req.json().catch(() => ({}));
  const role = body.role === "ADMIN" || body.role === "SAGLIK" ? body.role : "FIRMA";
  const email = String(body.email || "").trim().toLowerCase();
  const name = String(body.name || "").trim();
  if (!email.includes("@")) return jsonError("Geçerli bir e-posta girin");
  if (!name) return jsonError("Ad soyad gerekli");
  if (await prisma.user.findUnique({ where: { email } })) return jsonError("Bu e-posta ile kayıtlı bir hesap var");
  const password = String(body.password || "").trim() || tempPassword();
  if (password.length < 8) return jsonError("Şifre en az 8 karakter olmalı");

  let companyId: string | null = null;
  const kind = accountKind(validKind(body.kind));
  if (role === "FIRMA") {
    if (body.companyId) {
      const existing = await prisma.company.findUnique({ where: { id: String(body.companyId) } });
      if (!existing) return jsonError("Kurum bulunamadı");
      companyId = existing.id;
    } else {
      const orgName = String(body.orgName || "").trim() || (kind.id === "konusmaci" ? name : "");
      if (!orgName) return jsonError(`${kind.orgLabel} gerekli`);
      const companyName = kind.id === "konusmaci" ? name : orgName;
      let slug = slugify(companyName) || kind.id;
      if (await prisma.company.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
      const company = await prisma.company.create({
        data: {
          slug,
          name: companyName,
          kind: kind.id,
          scope: kind.id === "startup" ? "Startup" : "Local",
          topic: kind.id === "konusmaci" ? orgName : "",
          participationDates: String(body.participationDates || ""),
          status: "Onaylandı",
          contactName: name,
          contactEmail: email,
          contactPhone: String(body.phone || ""),
          notes: `${kind.label} hesabı admin tarafından açıldı.`,
        },
      });
      companyId = company.id;
      if (kind.firmTools) {
        await prisma.companyRule.createMany({
          data: STANDARD_RULES.map((r) => ({ ...r, companyId: company.id, status: "Bekliyor" })),
        });
      }
    }
  }

  const created = await prisma.user.create({
    data: {
      email,
      name,
      role,
      passwordHash: await bcrypt.hash(password, 10),
      phone: String(body.phone || ""),
      title: String(body.title || "").trim() || (role === "FIRMA" ? kind.contact : role === "ADMIN" ? "Admin" : "Sağlık Bakanlığı"),
      accountStatus: "Onaylandı",
      companyId,
    },
    select: USER_SELECT,
  });
  broadcast({ type: "account" });
  return jsonOk({ user: created, password }, 201);
}
