import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = String(body.email || "").trim().toLowerCase();
  const fullName = String(body.fullName || "").trim();
  const slug = String(body.slug || "");
  if (!fullName || !email.includes("@")) return jsonError("Ad ve geçerli e-posta gerekli");
  const event = await prisma.pavilionEvent.findUnique({ where: { slug } });
  if (!event || !event.published) return jsonError("Etkinlik yok", 404);

  let visitor = await prisma.visitor.findFirst({ where: { email } });
  if (!visitor) {
    visitor = await prisma.visitor.create({
      data: {
        fullName,
        email,
        phone: body.phone || "",
        organization: body.organization || "",
        city: body.city || "",
        visitorType: body.visitorType || "Ziyaretçi",
        consent: body.consent !== false,
      },
    });
  } else {
    visitor = await prisma.visitor.update({
      where: { id: visitor.id },
      data: {
        fullName,
        phone: body.phone || visitor.phone,
        organization: body.organization || visitor.organization,
        city: body.city || visitor.city,
        visitorType: body.visitorType || visitor.visitorType,
      },
    });
  }

  const config = JSON.parse(event.config || "{}") as {
    questions?: { answer?: number }[];
    passScore?: number;
    slices?: { label: string; prize: string }[];
  };
  let score = 0;
  let prize = "";
  if (event.type === "gift-qa" || event.type === "quiz") {
    const answers: number[] = Array.isArray(body.answers) ? body.answers.map(Number) : [];
    (config.questions || []).forEach((q, i) => {
      if (typeof q.answer === "number" && answers[i] === q.answer) score += 1;
    });
    if (score >= (config.passScore || 1)) prize = event.gift;
  } else if (event.type === "wheel") {
    const slices = config.slices || [];
    const pick = slices[Math.floor(Math.random() * Math.max(slices.length, 1))];
    prize = body.prize || pick?.prize || event.gift;
  } else {
    prize = event.gift;
  }

  const signup = await prisma.eventSignup.create({
    data: {
      eventId: event.id,
      visitorId: visitor.id,
      collectedByName: body.elci || "",
      collectedByRole: body.elci ? "elci" : "qr",
      answers: JSON.stringify(body.answers || body.survey || {}),
      prize,
      score,
    },
  });
  return jsonOk({ id: signup.id, score, prize, pass: Boolean(prize) }, 201);
}
