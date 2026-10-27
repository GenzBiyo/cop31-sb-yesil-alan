import { prisma } from "./prisma";
import { prizePassPath } from "./prize-pass";
import { SAMPLE_WHEEL, pickWeightedIndex, wheelLandMod } from "./wheel";

export const ONCE_SLICES = SAMPLE_WHEEL.slices.filter((slice) => slice.kind !== "again");

export function wheelWho(email: string, deviceId = "") {
  const mail = email.trim().toLowerCase();
  if (mail.includes("@")) return mail;
  return deviceId ? `device:${deviceId}` : "";
}

function landOf(index: number) {
  return wheelLandMod(index, ONCE_SLICES, 0);
}

async function sessionTitle(refId: string) {
  const agenda = await prisma.agendaItem.findUnique({ where: { id: refId }, select: { title: true } });
  if (agenda) return agenda.title;
  const event = await prisma.pavilionEvent.findUnique({ where: { id: refId }, select: { title: true } });
  if (event) return event.title;
  const game = await prisma.game.findUnique({ where: { id: refId }, select: { title: true } });
  return game?.title || "";
}

function present(row: { id: string; sliceIndex: number; label: string; fullName: string; eventTitle: string }, used: boolean) {
  return {
    used,
    id: row.id,
    index: row.sliceIndex,
    label: row.label,
    land: landOf(row.sliceIndex),
    fullName: row.fullName,
    eventTitle: row.eventTitle,
    passPath: prizePassPath(row.id),
  };
}

export async function claimJoinWheel(refId: string, who: string, fullName = "") {
  if (!who) throw new Error("Önce kayıt olun");
  const title = await sessionTitle(refId);
  if (!title) throw new Error("Etkinlik yok");

  const existing = await prisma.wheelSpin.findUnique({ where: { agendaId_who: { agendaId: refId, who } } });
  if (existing) return present(existing, true);

  const index = pickWeightedIndex(ONCE_SLICES);
  const label = ONCE_SLICES[index]?.label || "Teşekkür";
  const name = fullName.trim();
  try {
    const row = await prisma.wheelSpin.create({
      data: { agendaId: refId, who, label, sliceIndex: index, fullName: name, eventTitle: title },
    });
    return present(row, false);
  } catch {
    const again = await prisma.wheelSpin.findUnique({ where: { agendaId_who: { agendaId: refId, who } } });
    if (!again) throw new Error("Çark kaydedilemedi");
    return present(again, true);
  }
}

export async function panelWheelOpen(refId: string, who: string) {
  if (!who || !refId) return false;
  const title = await sessionTitle(refId);
  if (!title) return false;
  const existing = await prisma.wheelSpin.findUnique({
    where: { agendaId_who: { agendaId: refId, who } },
    select: { id: true },
  });
  return !existing;
}
