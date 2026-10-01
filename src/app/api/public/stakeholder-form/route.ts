import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api";
import { cleanInput, MINISTRY_NAME, MINISTRY_UNITS, OTHER_UNIT, toDb } from "@/lib/stakeholder-form";
import { broadcast } from "@/lib/realtime";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const unit = req.nextUrl.searchParams.get("unit") || "";
  if (unit) {
    if (!MINISTRY_UNITS.includes(unit)) return jsonError("Birim yok", 404);
    const email = (req.nextUrl.searchParams.get("email") || "").toLocaleLowerCase("tr");
    const slots = await prisma.ministrySlot.findMany({ where: { unit, open: true } });
    return jsonOk({
      slots: slots.map((s) => ({
        date: s.date,
        time: s.time,
        state: !s.bookingEmail ? "open" : email && s.bookingEmail === email ? "mine" : "booked",
      })),
    });
  }
  const companies = await prisma.company.findMany({
    where: { status: "Onaylandı" },
    select: { name: true },
    orderBy: { name: "asc" },
  });
  return jsonOk({ companies: companies.map((c) => c.name).filter((n) => n !== MINISTRY_NAME) });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return jsonError("Geçersiz istek");
  const { data, error } = cleanInput(body as Record<string, unknown>);
  if (!data) return jsonError(error || "Form eksik");
  const mm = data.ministryMeeting;
  const unitCalendar = mm.wanted === "Evet" && mm.unit !== OTHER_UNIT;
  if (unitCalendar && !(mm.date && mm.time)) {
    const free = await prisma.ministrySlot.count({ where: { unit: mm.unit, open: true, OR: [{ bookingEmail: "" }, { bookingEmail: data.email }] } });
    if (free) return jsonError("Birimin takviminden bir saat seçin.");
  }
  const wantsSlot = unitCalendar && !!(mm.date && mm.time);
  const db = toDb(data);

  try {
    const updated = await prisma.$transaction(async (tx) => {
      if (wantsSlot) {
        const slot = await tx.ministrySlot.findUnique({ where: { unit_date_time: { unit: mm.unit, date: mm.date, time: mm.time } } });
        if (!slot || !slot.open) throw new Error("Seçtiğiniz saat artık açık değil. Lütfen takvimden başka bir saat seçin.");
        if (slot.bookingEmail && slot.bookingEmail !== data.email) throw new Error("Seçtiğiniz saat başka bir paydaş tarafından alındı. Lütfen başka bir saat seçin.");
        await tx.ministrySlot.updateMany({ where: { bookingEmail: data.email, NOT: { id: slot.id } }, data: { bookingEmail: "" } });
        await tx.ministrySlot.update({ where: { id: slot.id }, data: { bookingEmail: data.email } });
      } else {
        await tx.ministrySlot.updateMany({ where: { bookingEmail: data.email }, data: { bookingEmail: "" } });
      }
      const existing = await tx.stakeholderResponse.findUnique({ where: { email: data.email } });
      if (existing) {
        await tx.stakeholderResponse.update({ where: { email: data.email }, data: { ...db, source: "web", submittedAt: new Date() } });
      } else {
        await tx.stakeholderResponse.create({ data: { ...db, source: "web" } });
      }
      return !!existing;
    });
    broadcast({ type: "account" });
    return jsonOk({ ok: true, updated });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Kaydedilemedi", 409);
  }
}
