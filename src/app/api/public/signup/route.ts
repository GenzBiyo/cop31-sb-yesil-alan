import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api";

function isQa(type: string) {
  return type === "gift-qa" || type === "quiz";
}

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
  const step = String(body.step || "");
  const answers: number[] = Array.isArray(body.answers) ? body.answers.map(Number) : [];
  const hasAnswers = answers.length > 0;

  async function findSignup() {
    if (body.signupId) {
      const byId = await prisma.eventSignup.findFirst({
        where: { id: String(body.signupId), eventId: event.id, visitorId: visitor.id },
      });
      if (byId) return byId;
    }
    return prisma.eventSignup.findFirst({
      where: { eventId: event.id, visitorId: visitor.id },
      orderBy: { createdAt: "desc" },
    });
  }

  if (isQa(event.type) && (step === "register" || (!hasAnswers && step !== "play"))) {
    let signup = await findSignup();
    let created = false;
    if (!signup) {
      signup = await prisma.eventSignup.create({
        data: {
          eventId: event.id,
          visitorId: visitor.id,
          collectedByName: body.elci || "",
          collectedByRole: body.elci ? "elci" : "qr",
          answers: "{}",
        },
      });
      created = true;
    }
    const played = signup.answers !== "{}" && signup.answers !== "[]";
    return jsonOk(
      {
        id: signup.id,
        registered: true,
        alreadyPlayed: played,
        score: signup.score,
        prize: signup.prize,
        pass: Boolean(signup.prize),
      },
      created ? 201 : 200,
    );
  }

  if (isQa(event.type) && !hasAnswers) {
    return jsonError("Önce kayıt olun, sonra soruları yanıtlayın");
  }

  let score = 0;
  let prize = "";
  if (isQa(event.type)) {
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

  if (isQa(event.type)) {
    let signup = await findSignup();
    if (!signup) return jsonError("Önce kayıt olun");
    signup = await prisma.eventSignup.update({
      where: { id: signup.id },
      data: {
        answers: JSON.stringify(answers),
        prize,
        score,
      },
    });
    return jsonOk({ id: signup.id, score, prize, pass: Boolean(prize) });
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
