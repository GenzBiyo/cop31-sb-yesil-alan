import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { addNote } from "@/lib/visitor-app";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const { user, error } = await withUser();
  if (error || !user) return error;
  if (!canManage(user.role)) return jsonError("Yetki yok", 403);
  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  const question = await prisma.sessionQuestion.findUnique({ where: { id } });
  if (!question) return jsonError("Soru yok", 404);

  const answer = body.answer != null ? String(body.answer).trim().slice(0, 600) : question.answer;
  let status = String(body.status || question.status);
  if (!["Yeni", "Sahnede", "Yanıtlandı"].includes(status)) status = question.status;
  if (answer && answer !== question.answer) status = "Yanıtlandı";

  await prisma.sessionQuestion.update({ where: { id }, data: { status, answer } });

  if (status === "Sahnede" && question.status !== "Sahnede") {
    await addNote(question.deviceId, "Sorunuz sahneye alındı", question.body, "question", question.id);
  }
  if (answer && answer !== question.answer) {
    await addNote(question.deviceId, "Sorunuza yanıt", answer, "question", question.id);
  }
  return jsonOk({ ok: true });
}
