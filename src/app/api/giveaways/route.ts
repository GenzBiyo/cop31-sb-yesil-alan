import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { ensureGiveawayCatalog, packageSlug, saveGiveawayImage, tlToKurus } from "@/lib/giveaways";

export const runtime = "nodejs";

export async function GET() {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  await ensureGiveawayCatalog();
  const staff = canManage(user.role);
  const items = await prisma.giveawayItem.findMany({
    where: staff ? { published: true } : { published: true },
    include: {
      pledges: {
        include: { company: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });
  const visible = items.map((item) => {
    const packagesTaken = item.pledges.reduce((sum, pledge) => sum + pledge.packages, 0);
    const pledges = staff
      ? item.pledges
      : item.pledges
          .filter((pledge) => pledge.companyId === user.companyId)
          .map((pledge) => ({ ...pledge, company: { id: pledge.company.id, name: pledge.company.name } }));
    const { sourceUrl: _sourceUrl, ...rest } = item;
    return { ...rest, packagesTaken, pledges };
  });
  return jsonOk({ items: visible, staff, companyId: user.companyId });
}

export async function POST(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Paketi Sağlık Bakanlığı ekler", 403);
  const form = await req.formData();
  const title = String(form.get("title") || "").trim();
  if (!title) return jsonError("Paket adı gerekli");
  const packageQty = Number(form.get("packageQty") || 0);
  const vatRate = Number(form.get("vatRate") || 20);
  const packagePrice = tlToKurus(form.get("packagePrice") || 0) ?? 0;
  if (!Number.isInteger(packageQty) || packageQty < 0) return jsonError("Paketteki adet geçersiz");
  if (!Number.isInteger(vatRate) || vatRate < 0 || vatRate > 100) return jsonError("KDV oranı 0 ile 100 arasında olmalı");
  if (packagePrice < 0) return jsonError("Paket fiyatı geçersiz");
  const image = form.get("image");
  let imagePath = "";
  try {
    if (image instanceof File && image.size) imagePath = await saveGiveawayImage(image);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Fotoğraf yüklenemedi");
  }
  const last = await prisma.giveawayItem.aggregate({ _max: { sortOrder: true } });
  const item = await prisma.giveawayItem.create({
    data: {
      slug: packageSlug(title),
      kind: "esantiyon",
      title,
      detail: String(form.get("detail") || "").trim(),
      printNote: String(form.get("printNote") || "").trim(),
      packageQty,
      packagePrice,
      vatRate,
      imagePath,
      sortOrder: (last._max.sortOrder || 0) + 1,
      published: true,
    },
  });
  return jsonOk(item, 201);
}
