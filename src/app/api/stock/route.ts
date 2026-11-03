import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, withUser } from "@/lib/api";

const KINDS = new Set(["esantiyon", "ikram"]);

function amountOf(value: unknown) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 1_000_000) return null;
  return n;
}

export async function GET() {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (user.role !== "ADMIN" && user.role !== "ELCI") return jsonError("Yetkiniz yok", 403);
  const items = await prisma.stockItem.findMany({
    orderBy: [{ kind: "asc" }, { title: "asc" }],
    include: { logs: { orderBy: { createdAt: "desc" }, take: 8 } },
  });
  return jsonOk({ items });
}

export async function POST(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");
  const actor = user.name || user.email;

  if (action === "create" || action === "add") {
    if (user.role !== "ADMIN") return jsonError("Stok girişini admin yapar", 403);
  } else if (action === "use") {
    if (user.role !== "ADMIN" && user.role !== "ELCI") return jsonError("Yetkiniz yok", 403);
  } else {
    return jsonError("Bilinmeyen işlem");
  }

  if (action === "create") {
    const title = String(body.title || "").trim().slice(0, 120);
    const kind = String(body.kind || "");
    const unit = String(body.unit || "adet").trim().slice(0, 24) || "adet";
    const note = String(body.note || "").trim().slice(0, 500);
    const quantity = amountOf(body.quantity);
    if (!title) return jsonError("Ad gerekli");
    if (!KINDS.has(kind)) return jsonError("Tür eşantiyon veya ikram olmalı");
    if (quantity == null) return jsonError("Adet geçersiz");
    const item = await prisma.stockItem.create({
      data: {
        title,
        kind,
        unit,
        quantity,
        note,
        logs: quantity
          ? { create: { delta: quantity, quantity, note: note || "İlk stok", actor } }
          : undefined,
      },
    });
    return jsonOk(item, 201);
  }

  const id = String(body.id || "");
  const amount = amountOf(body.amount);
  const note = String(body.note || "").trim().slice(0, 500);
  if (!id) return jsonError("Kayıt seçin");
  if (amount == null || amount < 1) return jsonError("Adet 1 veya daha büyük olmalı");

  try {
    const item = await prisma.$transaction(async (tx) => {
      const current = await tx.stockItem.findUnique({ where: { id } });
      if (!current) throw new Error("Kayıt bulunamadı");
      const next = action === "add" ? current.quantity + amount : current.quantity - amount;
      if (next < 0) throw new Error("Stok yetmiyor");
      const updated = await tx.stockItem.update({ where: { id }, data: { quantity: next } });
      await tx.stockLog.create({
        data: {
          itemId: id,
          delta: action === "add" ? amount : -amount,
          quantity: next,
          note,
          actor,
        },
      });
      return updated;
    });
    return jsonOk(item);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Stok güncellenemedi");
  }
}
