import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { tlToKurus } from "@/lib/giveaways";

const DAY = /^2026-11-(0[9]|1\d|20)$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function withTaken<T extends { pledges: { packages: number }[] }>(item: T) {
  const packagesTaken = item.pledges.reduce((sum, pledge) => sum + pledge.packages, 0);
  return { ...item, packagesTaken };
}

const include = {
  pledges: {
    include: { company: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" as const },
  },
};

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const { id } = await params;
  const existing = await prisma.giveawayItem.findUnique({ where: { id }, include });
  if (!existing || !existing.published) return jsonError("Kayıt yok", 404);
  const body = await req.json();
  const staff = canManage(user.role);

  if (body.action === "claim") {
    if (user.role !== "FIRMA" || !user.companyId) return jsonError("Sponsorluğu paydaş hesabı alır", 403);
    if (existing.packageQty < 1 || existing.packagePrice < 1) return jsonError("Bakanlık paket adedini ve fiyatını henüz belirlemedi");
    const packages = Number(body.packages);
    if (!Number.isInteger(packages) || packages < 1) return jsonError("Paket sayısı en az 1 olmalı");
    await prisma.giveawayPledge.create({
      data: {
        itemId: id,
        companyId: user.companyId,
        packages,
        quantity: packages * existing.packageQty,
        agreedPrice: existing.packagePrice,
      },
    });
    const item = await prisma.giveawayItem.findUnique({ where: { id }, include });
    return jsonOk(withTaken(item!), 201);
  }

  if (body.action === "release") {
    const pledge = existing.pledges.find((row) => row.id === body.pledgeId);
    if (!pledge) return jsonError("Sponsorluk yok", 404);
    const owns = user.role === "FIRMA" && user.companyId === pledge.companyId && !pledge.distributeDate;
    if (!staff && !owns) return jsonError("Bu sponsorluğu kaldıramazsınız", 403);
    await prisma.giveawayPledge.delete({ where: { id: pledge.id } });
    const item = await prisma.giveawayItem.findUnique({ where: { id }, include });
    return jsonOk(withTaken(item!));
  }

  if (body.action === "schedule") {
    if (!staff) return jsonError("Dağıtım gününü Sağlık Bakanlığı belirler", 403);
    const pledge = existing.pledges.find((row) => row.id === body.pledgeId);
    if (!pledge) return jsonError("Sponsorluk yok", 404);
    const distributeDate = String(body.distributeDate || "");
    const distributeStart = String(body.distributeStart || "");
    const distributeEnd = String(body.distributeEnd || "");
    if (!DAY.test(distributeDate)) return jsonError("Gün 9–20 Kasım 2026 olmalı");
    if (!TIME.test(distributeStart)) return jsonError("Başlangıç saati gerekli");
    if (distributeEnd && (!TIME.test(distributeEnd) || distributeEnd <= distributeStart)) {
      return jsonError("Bitiş saati başlangıçtan sonra olmalı");
    }
    await prisma.giveawayPledge.update({
      where: { id: pledge.id },
      data: { distributeDate, distributeStart, distributeEnd },
    });
    const item = await prisma.giveawayItem.findUnique({ where: { id }, include });
    return jsonOk(withTaken(item!));
  }

  if (!staff) return jsonError("Paket fiyatı ve adedini Sağlık Bakanlığı belirler", 403);
  const data: { packageQty?: number; packagePrice?: number; vatRate?: number; title?: string; detail?: string; printNote?: string } = {};
  if ("packageQty" in body) {
    const packageQty = Number(body.packageQty);
    if (!Number.isInteger(packageQty) || packageQty < 1) return jsonError("Paketteki adet en az 1 olmalı");
    data.packageQty = packageQty;
  }
  if ("packagePrice" in body) {
    const packagePrice = tlToKurus(body.packagePrice);
    if (packagePrice == null || packagePrice < 1) return jsonError("Paket fiyatı geçersiz");
    data.packagePrice = packagePrice;
  }
  if ("vatRate" in body) {
    const vatRate = Number(body.vatRate);
    if (!Number.isInteger(vatRate) || vatRate < 0 || vatRate > 100) return jsonError("KDV oranı 0 ile 100 arasında olmalı");
    data.vatRate = vatRate;
  }
  if ("title" in body) {
    const title = String(body.title || "").trim();
    if (!title) return jsonError("Ad gerekli");
    data.title = title;
  }
  if ("detail" in body) data.detail = String(body.detail || "").trim();
  if ("printNote" in body) data.printNote = String(body.printNote || "").trim();

  const item = await prisma.giveawayItem.update({ where: { id }, data, include });
  return jsonOk(withTaken(item));
}
