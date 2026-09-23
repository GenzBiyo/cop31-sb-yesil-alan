import nodemailer from "nodemailer";
import { prisma } from "./prisma";

export async function sendMail(to: string, subject: string, body: string) {
  const host = process.env.SMTP_HOST;
  if (!host) {
    await prisma.emailLog.create({
      data: { to, subject, body, status: "Simüle edildi (SMTP tanımlı değil)" },
    });
    return { simulated: true };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "COP31 Sağlık Pavilionu <noreply@cop31.saglik.gov.tr>",
      to,
      subject,
      text: body,
      html: `<div style="font-family:Georgia,serif;color:#1a1a1a"><p>${body.replace(/\n/g, "<br/>")}</p><hr/><p style="color:#0077C2;font-size:12px">T.C. Sağlık Bakanlığı · COP31 Sağlık Pavilionu</p></div>`,
    });
    await prisma.emailLog.create({ data: { to, subject, body, status: "Gönderildi" } });
    return { simulated: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mail hatası";
    await prisma.emailLog.create({
      data: { to, subject, body, status: `Hata: ${message}` },
    });
    throw error;
  }
}
