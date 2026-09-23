import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api";
import { slugify } from "@/lib/company";
import { sendMail } from "@/lib/mail";
import { broadcast } from "@/lib/realtime";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const companyName = String(body.companyName || "").trim();
  const name = String(body.name || "").trim();
  if (!email || !email.includes("@")) return jsonError("Geçerli bir e-posta girin");
  if (password.length < 8) return jsonError("Şifre en az 8 karakter olmalı");
  if (!companyName) return jsonError("Firma adı gerekli");
  if (!name) return jsonError("Yetkili adı gerekli");

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return jsonError("Bu e-posta ile kayıtlı bir hesap var");

  let company = await prisma.company.findFirst({
    where: { name: { equals: companyName } },
  });
  if (!company) {
    let slug = slugify(companyName) || "firma";
    const taken = await prisma.company.findUnique({ where: { slug } });
    if (taken) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
    company = await prisma.company.create({
      data: {
        slug,
        name: companyName,
        scope: body.scope || "Local",
        topic: body.topic || "",
        contribution: body.contribution || "",
        website: body.website || "",
        participationDates: body.participationDates || "",
        status: "Beklemede",
        contactName: name,
        contactEmail: email,
        contactPhone: body.phone || "",
        notes: "Firma self-servis kaydı — admin onayı bekleniyor.",
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
      title: body.title || "Firma yetkilisi",
      companyId: company.id,
      accountStatus: "Beklemede",
    },
  });

  const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
  const summary = `${company.name} — ${name} (${email}) hesap onayı bekliyor.`;
  for (const admin of admins) {
    await prisma.inboxItem.create({
      data: {
        userId: admin.id,
        title: "Yeni firma hesap başvurusu",
        body: summary,
      },
    });
    await sendMail(admin.email, "Yeni firma hesap başvurusu", `${summary}\n\nHazırlık masası → Hesap onayları.`);
  }
  await sendMail(
    email,
    "COP31 firma hesabınız alındı",
    `Sayın ${name},\n\n${company.name} adına oluşturulan hesabınız admin onayına gönderildi. Onay sonrası bu e-posta ile giriş yapabilirsiniz.\n\nT.C. Sağlık Bakanlığı · COP31 Sağlık Pavilionu`
  );
  broadcast({ type: "inbox" });
  broadcast({ type: "account" });
  return jsonOk({ ok: true, id: user.id }, 201);
}
