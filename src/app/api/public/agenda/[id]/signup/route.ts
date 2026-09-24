import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api";
import { sendMail } from "@/lib/mail";
import { formatWhen, validEmail, validPhone } from "@/lib/agenda";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json();
  const fullName = String(body.fullName || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const phone = String(body.phone || "").trim();
  const organization = String(body.organization || "").trim();
  const role = body.role === "konusmaci" ? "konusmaci" : "katilimci";
  if (!fullName) return jsonError("Ad soyad gerekli");
  if (!validEmail(email)) return jsonError("Geçerli e-posta gerekli");
  if (!validPhone(phone)) return jsonError("Telefon numarası gerekli");

  const item = await prisma.agendaItem.findUnique({
    where: { id },
    include: { day: true },
  });
  if (!item) return jsonError("Oturum yok", 404);

  const existing = await prisma.agendaSignup.findUnique({
    where: { agendaId_email: { agendaId: id, email } },
  });
  const signup = existing
    ? await prisma.agendaSignup.update({
        where: { id: existing.id },
        data: { fullName, phone, organization, role },
      })
    : await prisma.agendaSignup.create({
        data: { agendaId: id, fullName, email, phone, organization, role },
      });

  await sendMail(
    email,
    `COP31 kayıt: ${item.title}`,
    `Merhaba ${fullName},\n\n${item.title} kaydınız alındı.\n${formatWhen(item.day.date, item.startTime, item.endTime)}\n${item.location}\n\nSaat değişince veya etkinlik yaklaşınca bu e-postaya haber gider.\n`
  );

  return jsonOk({ id: signup.id, email }, 201);
}
