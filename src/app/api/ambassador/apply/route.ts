import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api";
import { CORE_KEYS } from "@/lib/ambassador";
import { ensureAmbassadorForm } from "@/lib/ambassador-db";
import { sendMail } from "@/lib/mail";

function asString(v: unknown) {
  if (Array.isArray(v)) return v.map(String).join(", ");
  if (v == null) return "";
  return String(v).trim();
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { fields } = await ensureAmbassadorForm();
  const enabled = fields.filter((f) => f.enabled);
  for (const field of enabled) {
    if (!field.required) continue;
    const value = asString(body[field.key]);
    if (!value) return jsonError(`${field.label} zorunlu`);
  }
  const email = asString(body.email).toLowerCase();
  if (!email.includes("@")) return jsonError("Geçerli bir e-posta girin");
  const existing = await prisma.ambassadorApplication.findFirst({
    where: { email, status: { not: "Reddedildi" } },
  });
  if (existing) return jsonError("Bu e-posta ile açık bir başvurunuz var.");

  const core: Record<string, string> = {};
  const extra: Record<string, unknown> = {};
  for (const field of enabled) {
    const value = body[field.key];
    if ((CORE_KEYS as readonly string[]).includes(field.key)) core[field.key] = asString(value);
    else extra[field.key] = value;
  }

  const created = await prisma.ambassadorApplication.create({
    data: {
      fullName: core.fullName || asString(body.fullName),
      email,
      phone: core.phone || "",
      school: core.school || "",
      schoolType: core.schoolType || "",
      department: core.department || "",
      city: core.city || "",
      englishLevel: core.englishLevel || "",
      otherLanguages: core.otherLanguages || "",
      linkedin: core.linkedin || "",
      instagram: core.instagram || "",
      daysCount: Number(core.daysCount || body.daysCount || 0),
      availableDates: core.availableDates || "",
      motivation: core.motivation || "",
      skills: core.skills || "",
      extra: JSON.stringify(extra),
      status: "Beklemede",
    },
  });

  await sendMail(
    email,
    "İklim Sağlık Elçisi başvurunuz alındı",
    `Sayın ${created.fullName},\n\nCOP31 Türkiye — Sağlık Bakanlığı İklim Sağlık Elçisi başvurunuz alınmıştır. Kayıt kabul ve diğer bilgilendirmeler bu e-posta adresine gönderilecektir.\n\nT.C. Sağlık Bakanlığı · SGGM`
  );

  return jsonOk({ ok: true, id: created.id }, 201);
}
