import { prisma } from "./prisma";
import { COP_DATES } from "./cop-days";
import { loadDayPlan } from "./plan";
import { MEETING_ACCEPTED, MEETING_PENDING, participationDays, slotStates } from "./meeting-slots";

export type CalendarKind =
  | "katilim"
  | "toplanti"
  | "talep"
  | "slot"
  | "panel"
  | "sunum"
  | "etkinlik"
  | "program"
  | "sponsorluk"
  | "katilacagim"
  | "kayit";

export type CalendarEntry = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  kind: CalendarKind;
  title: string;
  detail: string;
  location: string;
  status: string;
  href?: string;
};

const REJECTED = new Set(["Reddedildi", "Red", "İptal", "Uygun değil"]);

export async function companyCalendar(companyId: string) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new Error("Firma bulunamadı");

  const [slots, incoming, outgoing, panels, events, agenda, sponsorships, joins, submissions, plan] = await Promise.all([
    prisma.meetingSlot.findMany({ where: { companyId }, orderBy: [{ date: "asc" }, { startTime: "asc" }] }),
    prisma.meetingRequest.findMany({
      where: { withKind: "firma", withId: companyId, status: { in: [MEETING_PENDING, MEETING_ACCEPTED] } },
      include: { fromDevice: { select: { name: true, organization: true } } },
    }),
    prisma.meetingRequest.findMany({
      where: { fromDevice: { role: "firma", companyId }, status: MEETING_ACCEPTED },
    }),
    prisma.panel.findMany({
      where: {
        OR: [
          { companyId },
          { participants: { some: { person: { companySlug: company.slug } } } },
          { participants: { some: { person: { organization: company.name } } } },
        ],
      },
      include: { participants: { include: { person: { select: { name: true } } } } },
    }),
    prisma.pavilionEvent.findMany({ where: { companyId } }),
    prisma.agendaItem.findMany({ where: { companyId, panelId: null }, include: { day: { select: { date: true } } } }),
    prisma.gameSponsorship.findMany({ where: { companyId }, include: { game: { select: { title: true } } } }),
    prisma.calendarJoin.findMany({ where: { companyId } }),
    prisma.companySubmission.findMany({ where: { companyId, type: { in: ["calendar", "etkinlik"] }, NOT: { eventDate: "" } } }),
    loadDayPlan(),
  ]);

  const out: CalendarEntry[] = [];

  for (const date of participationDays(company.participationDates)) {
    out.push({
      id: `katilim-${date}`,
      date,
      startTime: "",
      endTime: "",
      kind: "katilim",
      title: "Pavilyonda katılım günü",
      detail: company.booth ? `Stant ${company.booth}` : "",
      location: "Sağlık Pavilionu",
      status: "",
    });
  }

  const states = await slotStates(slots.map((s) => s.id));
  const bySlot = new Map(incoming.filter((m) => m.slotId).map((m) => [`${m.slotId}:${m.status}`, m]));
  for (const slot of slots) {
    const st = states.get(slot.id);
    if (st?.state === "dolu") {
      const m = bySlot.get(`${slot.id}:${MEETING_ACCEPTED}`);
      out.push({
        id: `slot-${slot.id}`,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        kind: "toplanti",
        title: m ? `Toplantı: ${m.fromDevice.name}${m.fromDevice.organization ? ` · ${m.fromDevice.organization}` : ""}` : "Toplantı",
        detail: m?.topic || "",
        location: m?.location || slot.location,
        status: "Onaylandı",
        href: "/profil#toplanti",
      });
    } else if (st?.state === "bekliyor") {
      out.push({
        id: `slot-${slot.id}`,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        kind: "talep",
        title: `Toplantı talebi (${st.pending})`,
        detail: "Onayınızı bekliyor",
        location: slot.location,
        status: "Onay bekliyor",
        href: "/profil#toplanti",
      });
    } else {
      out.push({
        id: `slot-${slot.id}`,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        kind: "slot",
        title: "Uygun toplantı saati",
        detail: "",
        location: slot.location,
        status: "Boş",
        href: "/profil#toplanti",
      });
    }
  }

  for (const m of incoming.filter((row) => !row.slotId)) {
    const accepted = m.status === MEETING_ACCEPTED;
    const date = accepted ? m.whenDate : m.preferredDate;
    if (!date) continue;
    out.push({
      id: `meeting-${m.id}`,
      date,
      startTime: accepted ? m.startTime : m.preferredTime,
      endTime: accepted ? m.endTime : "",
      kind: accepted ? "toplanti" : "talep",
      title: `${accepted ? "Toplantı" : "Toplantı talebi"}: ${m.fromDevice.name}${m.fromDevice.organization ? ` · ${m.fromDevice.organization}` : ""}`,
      detail: m.topic,
      location: m.location,
      status: accepted ? "Onaylandı" : "Onay bekliyor",
      href: "/profil#toplanti",
    });
  }

  for (const m of outgoing) {
    if (!m.whenDate) continue;
    out.push({
      id: `meeting-${m.id}`,
      date: m.whenDate,
      startTime: m.startTime,
      endTime: m.endTime,
      kind: "toplanti",
      title: `Görüşme: ${m.withName}`,
      detail: m.topic,
      location: m.location,
      status: "Onaylandı",
    });
  }

  for (const p of panels) {
    if (REJECTED.has(p.status)) continue;
    const people = p.participants.map((x) => x.person.name).join(", ");
    out.push({
      id: `panel-${p.id}`,
      date: p.date,
      startTime: p.startTime,
      endTime: p.endTime,
      kind: p.kind === "sunum" ? "sunum" : "panel",
      title: p.title,
      detail: people,
      location: p.location,
      status: p.status,
      href: p.kind === "sunum" ? "/sunumlar" : "/paneller",
    });
  }

  for (const ev of events) {
    if (!ev.date || REJECTED.has(ev.approvalStatus)) continue;
    out.push({
      id: `event-${ev.id}`,
      date: ev.date,
      startTime: ev.startTime,
      endTime: ev.endTime,
      kind: "etkinlik",
      title: ev.title,
      detail: ev.gift ? `Hediye: ${ev.gift}` : ev.topic,
      location: ev.location,
      status: ev.approvalStatus,
      href: "/etkinlikler",
    });
  }

  for (const item of agenda) {
    out.push({
      id: `agenda-${item.id}`,
      date: item.day.date,
      startTime: item.startTime,
      endTime: item.endTime,
      kind: "program",
      title: item.title,
      detail: item.type,
      location: item.location,
      status: item.status,
      href: "/program",
    });
  }

  for (const s of sponsorships) {
    if (REJECTED.has(s.status)) continue;
    out.push({
      id: `sponsor-${s.id}`,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      kind: "sponsorluk",
      title: `Oyun sponsorluğu: ${s.game.title}`,
      detail: s.prize ? `Ödül: ${s.prize}${s.prizeQty ? ` × ${s.prizeQty}` : ""}` : "",
      location: "Sağlık Pavilionu — Oyun alanı",
      status: s.status,
      href: "/oyun-sponsorluk",
    });
  }

  const planItems = new Map(plan.flatMap((day) => day.items.map((item) => [item.id, { ...item, date: day.date }] as const)));
  const own = new Set(out.map((e) => e.id));
  for (const key of new Set(joins.map((j) => j.itemKey))) {
    const item = planItems.get(key);
    if (!item || own.has(key)) continue;
    out.push({
      id: `join-${key}`,
      date: item.date,
      startTime: item.startTime,
      endTime: item.endTime,
      kind: "katilacagim",
      title: item.title,
      detail: item.people,
      location: item.location,
      status: "Katılacağım",
      href: "/program",
    });
  }

  for (const s of submissions) {
    if (REJECTED.has(s.status)) continue;
    out.push({
      id: `kayit-${s.id}`,
      date: s.eventDate.slice(0, 10),
      startTime: "",
      endTime: "",
      kind: "kayit",
      title: s.title,
      detail: s.payload.slice(0, 160),
      location: "",
      status: s.status,
      href: "/profil",
    });
  }

  out.sort((a, b) => a.date.localeCompare(b.date) || (a.startTime || "00").localeCompare(b.startTime || "00"));
  const days = COP_DATES.map((date) => ({ date, items: out.filter((e) => e.date === date) }));
  const other = out.filter((e) => !COP_DATES.includes(e.date));
  return { company: { id: company.id, name: company.name, booth: company.booth, participationDates: company.participationDates }, days, other };
}
