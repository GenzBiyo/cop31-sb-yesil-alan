import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api";
import { slugify } from "@/lib/company";
import { sendMail } from "@/lib/mail";
import { broadcast } from "@/lib/realtime";
import { accountKind, validKind } from "@/lib/account-kinds";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const kind = accountKind(validKind(body.kind));
  const name = String(body.name || "").trim();
  const companyName = String(body.companyName || "").trim() || (kind.id === "konusmaci" ? name : "");
  if (!email || !email.includes("@")) return jsonError("Geçerli bir e-posta girin");
  if (password.length < 8) return jsonError("Şifre en az 8 karakter olmalı");
  if (!companyName) return jsonError(`${kind.orgLabel} gerekli`);
  if (!name) return jsonError("Yetkili adı gerekli");

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return jsonError("Bu e-posta ile kayıtlı bir hesap var");

  let company =
    kind.id === "konusmaci"
      ? null
      : await prisma.company.findFirst({
          where: { name: { equals: companyName } },
        });
  if (!company) {
    let slug = slugify(kind.id === "konusmaci" ? name : companyName) || kind.id;
    const taken = await prisma.company.findUnique({ where: { slug } });
    if (taken) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
    company = await prisma.company.create({
      data: {
        slug,
        name: kind.id === "konusmaci" ? name : companyName,
        kind: kind.id,
        scope: kind.id === "startup" ? "Startup" : body.scope || "Local",
        contribution: body.contribution || "",
        website: body.website || "",
        participationDates: body.participationDates || "",
        status: "Beklemede",
        contactName: name,
        contactEmail: email,
        contactPhone: body.phone || "",
        topic: kind.id === "konusmaci" ? companyName : body.topic || "",
        notes: `${kind.label} self-servis kaydı — admin onayı bekleniyor.`,
      },
    });
  } else {
    await prisma.company.update({
      where: { id: company.id },
      data: {
        contactName: company.contactName || name,
        contactEmail: company.contactEmail || email,
        contactPhone: company.contactPhone || body.phone || "",
      },
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: "FIRMA",
      phone: body.phone || "",
      title: String(body.title || "").trim() || kind.contact,
      companyId: company.id,
      accountStatus: "Beklemede",
    },
  });

  const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
  const summary = `${kind.label}: ${company.name} — ${name} (${email}) hesap onayı bekliyor.`;
  for (const admin of admins) {
    await prisma.inboxItem.create({
      data: {
        userId: admin.id,
        title: `Yeni hesap başvurusu · ${kind.label}`,
        body: summary,
      },
    });
    await sendMail(admin.email, `Yeni hesap başvurusu · ${kind.label}`, `${summary}\n\nHazırlık masası → Kullanıcı yönetimi.`);
  }
  await sendMail(
    email,
    "COP31 hesap başvurunuz alındı",
    `Sayın ${name},\n\n${company.name} adına oluşturulan ${kind.label.toLocaleLowerCase("tr-TR")} hesabınız admin onayına gönderildi. Onay sonrası bu e-posta ile giriş yapabilirsiniz.\n\nT.C. Sağlık Bakanlığı · COP31 Sağlık Pavilionu`
  );
  broadcast({ type: "inbox" });
  broadcast({ type: "account" });
  return jsonOk({ ok: true, id: user.id }, 201);
}
