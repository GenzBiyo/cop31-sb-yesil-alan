import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { FORM_DAYS, MINISTRY_UNITS, parseMinistryMeeting, SLOT_TIMES } from "@/lib/stakeholder-form";

async function manager() {
  const { user, error } = await withUser();
  if (error || !user) return { error: error! };
  if (!canManage(user.role)) return { error: jsonError("Yetkiniz yok", 403) };
  return { user };
}

export async function GET(req: NextRequest) {
  const { error } = await manager();
  if (error) return error;
  const unit = req.nextUrl.searchParams.get("unit") || "";
  if (!MINISTRY_UNITS.includes(unit)) return jsonError("Birim seçin");
  const slots = await prisma.ministrySlot.findMany({ where: { unit } });
  const emails = slots.map((s) => s.bookingEmail).filter(Boolean);
  const responses = emails.length ? await prisma.stakeholderResponse.findMany({ where: { email: { in: emails } } }) : [];
  const byEmail = new Map(responses.map((r) => [r.email, r]));
  return jsonOk({
    slots: slots.map((s) => {
      const r = s.bookingEmail ? byEmail.get(s.bookingEmail) : undefined;
      const mm = r ? parseMinistryMeeting(r.ministryMeeting) : null;
      return {
        date: s.date,
        time: s.time,
        open: s.open,
        booking: s.bookingEmail
          ? { email: s.bookingEmail, company: r?.companyName || s.bookingEmail, topic: mm?.topic || "", requester: mm?.requester || "", attendees: mm?.attendees || [] }
          : null,
      };
    }),
  });
}

/** Opens or closes slots: one slot, a whole day (no time) or the whole calendar (no date). Booked slots are never closed here. */
export async function POST(req: NextRequest) {
  const { error } = await manager();
  if (error) return error;
  const body = await req.json();
  const unit = String(body.unit || "");
  if (!MINISTRY_UNITS.includes(unit)) return jsonError("Birim seçin");

  if (body.action === "release") {
    const slot = await prisma.ministrySlot.findUnique({ where: { unit_date_time: { unit, date: String(body.date), time: String(body.time) } } });
    if (slot?.bookingEmail) {
      const r = await prisma.stakeholderResponse.findUnique({ where: { email: slot.bookingEmail } });
      const mm = r ? parseMinistryMeeting(r.ministryMeeting) : null;
      if (r && mm) {
        await prisma.stakeholderResponse.update({ where: { id: r.id }, data: { ministryMeeting: JSON.stringify({ ...mm, date: "", time: "" }) } });
      }
      await prisma.ministrySlot.update({ where: { id: slot.id }, data: { bookingEmail: "" } });
    }
    return jsonOk({ ok: true });
  }

  const open = body.open === true;
  const dates = body.date ? [String(body.date)].filter((d) => FORM_DAYS.includes(d)) : FORM_DAYS;
  const times = body.time ? [String(body.time)].filter((t) => SLOT_TIMES.includes(t)) : SLOT_TIMES;
  for (const date of dates) {
    for (const time of times) {
      if (open) {
        await prisma.ministrySlot.upsert({
          where: { unit_date_time: { unit, date, time } },
          create: { unit, date, time, open: true },
          update: { open: true },
        });
      } else {
        await prisma.ministrySlot.updateMany({ where: { unit, date, time, bookingEmail: "" }, data: { open: false } });
      }
    }
  }
  return jsonOk({ ok: true });
}
