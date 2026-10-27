import { prisma } from "./prisma";
import type { ElciSession } from "./ambassador-access";

export type PrizeView = {
  state: "login" | "give" | "thanks";
  fullName: string;
  eventTitle: string;
  label: string;
};

export async function redeemPrize(id: string, elci: ElciSession | null): Promise<PrizeView | null> {
  const spin = await prisma.wheelSpin.findUnique({ where: { id } });
  if (!spin) return null;
  const view = {
    fullName: spin.fullName || "Katılımcı",
    eventTitle: spin.eventTitle,
    label: spin.label,
  };
  if (spin.redeemedAt) return { state: "thanks", ...view };
  if (!elci) return { state: "login", fullName: "", eventTitle: "", label: "" };
  const taken = await prisma.wheelSpin.updateMany({
    where: { id, redeemedAt: null },
    data: { redeemedAt: new Date() },
  });
  if (!taken.count) return { state: "thanks", ...view };
  return { state: "give", ...view };
}
