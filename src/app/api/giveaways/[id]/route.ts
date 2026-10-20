import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { saveGiveawayImage, tlToKurus } from "@/lib/giveaways";

export const runtime = "nodejs";

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
  const staff = canManage(user.role);
  const multipart = (req.headers.get("content-type") || "").includes("multipart/form-data");
  const body = multipart ? Object.fromEntries(await req.formData()) : await req.json();

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
  const data: { packageQty?: number; packagePrice?: number; vatRate?: number; title?: string; detail?: string; printNote?: string; imagePath?: string } = {};
  if ("packageQty" in body && String(body.packageQty) !== "") {
    const packageQty = Number(body.packageQty);
    if (!Number.isInteger(packageQty) || packageQty < 0) return jsonError("Paketteki adet geçersiz");
    data.packageQty = packageQty;
  }
  if ("packagePrice" in body && String(body.packagePrice) !== "") {
    const packagePrice = tlToKurus(body.packagePrice);
    if (packagePrice == null || packagePrice < 0) return jsonError("Paket fiyatı geçersiz");
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
  const image = body.image;
  try {
    if (image instanceof File && image.size) data.imagePath = await saveGiveawayImage(image);
    else if (String(body.removeImage || "") === "1") data.imagePath = "";
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Fotoğraf yüklenemedi");
  }

  const item = await prisma.giveawayItem.update({ where: { id }, data, include });
  return jsonOk(withTaken(item));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Paketi Sağlık Bakanlığı siler", 403);
  const { id } = await params;
  const existing = await prisma.giveawayItem.findUnique({ where: { id } });
  if (!existing) return jsonError("Kayıt yok", 404);
  await prisma.giveawayItem.update({ where: { id }, data: { published: false } });
  return jsonOk({ ok: true });
}
