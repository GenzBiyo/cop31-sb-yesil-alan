import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api";
import { addNote, answerSessionQuestion, appState, deviceFromToken, notifySessionHosts, validDeviceToken } from "@/lib/visitor-app";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const token = (req.headers.get("x-cop31-device") || "").trim();
  if (!validDeviceToken(token)) return jsonError("Cihaz kimliği gerekli");
  const device = await deviceFromToken(token);
  if (!device) return jsonError("Cihaz kimliği gerekli");
  if (!device.name) return jsonError("Önce adınızı kaydedin");
  const body = await req.json().catch(() => ({}));
  const text = String(body.body || "").trim().slice(0, 500);
  const agendaId = String(body.agendaId || "").trim();
  if (text.length < 4) return jsonError("Soruyu biraz daha açık yazın");
  const item = agendaId
    ? await prisma.agendaItem.findUnique({ where: { id: agendaId } })
    : null;
  if (agendaId && !item) return jsonError("Oturum bulunamadı");

  await prisma.sessionQuestion.create({
    data: {
      deviceId: device.id,
      agendaId: item?.id || "",
      sessionTitle: item?.title || "Genel",
      author: device.name,
      authorRole: device.role,
      body: text,
    },
  });
  await addNote(
    device.id,
    "Sorunuz iletildi",
    item ? `${item.title}: ${text}` : text,
    "question",
    item?.id || ""
  );
  if (item) {
    await notifySessionHosts(item.id, "Oturumunuza soru geldi", `${device.name}: ${text}`, device.id);
  }
  return jsonOk(await appState(device.id), 201);
}

export async function PATCH(req: Request) {
  const token = (req.headers.get("x-cop31-device") || "").trim();
  if (!validDeviceToken(token)) return jsonError("Cihaz kimliği gerekli");
  const device = await deviceFromToken(token);
  if (!device) return jsonError("Cihaz kimliği gerekli");
  const body = await req.json().catch(() => ({}));
  try {
    await answerSessionQuestion(device.id, String(body.id || ""), String(body.answer || ""));
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Yanıt kaydedilemedi");
  }
  return jsonOk(await appState(device.id));
}
