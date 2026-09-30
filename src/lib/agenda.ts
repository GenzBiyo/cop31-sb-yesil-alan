import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";
import { broadcast } from "@/lib/realtime";
import { memoClear } from "@/lib/memo";
import { formatWhen, slotInstant } from "@/lib/agenda-time";

export type Audience = "katilimci" | "konusmaci" | "hepsi";
export { formatWhen, validEmail, validPhone, PAVILION_SLOTS } from "@/lib/agenda-time";

const PLACEHOLDER_TITLES = ["Günün etkinliği", "Sunum 1", "Sunum 2", "Panel 1", "Panel 2"];

let lastEnsure = 0;
let lastTick = 0;

export async function ensureAgendaSlots() {
  if (Date.now() - lastEnsure < 60_000) return;
  lastEnsure = Date.now();
  const placeholders = await prisma.agendaItem.findMany({
    where: { panelId: null, companyId: null, title: { in: PLACEHOLDER_TITLES } },
    select: { id: true },
  });
  const ids = placeholders.map((item) => item.id);
  if (!ids.length) return;
  await prisma.agendaSignup.deleteMany({ where: { agendaId: { in: ids } } });
  await prisma.agendaNotice.deleteMany({ where: { agendaId: { in: ids } } });
  await prisma.agendaItem.deleteMany({ where: { id: { in: ids } } });
  memoClear();
  broadcast({ type: "agenda" });
}

export async function tickAgendaReminders() {
  if (Date.now() - lastTick < 45_000) return;
  lastTick = Date.now();
  await ensureAgendaSlots();
  const now = Date.now();
  const items = await prisma.agendaItem.findMany({
    include: { day: true, signups: true },
  });
  for (const item of items) {
    const start = slotInstant(item.day.date, item.startTime).getTime();
    const ms = start - now;
    if (ms < -30 * 60_000) continue;
    if (!item.reminded24h && ms > 0 && ms <= 24 * 60 * 60_000) {
      await notifyAgenda(item.id, {
        kind: "upcoming-24h",
        audience: "hepsi",
        title: "Etkinlik yarın / 24 saat içinde",
        body: `${item.title} · ${formatWhen(item.day.date, item.startTime, item.endTime)} · ${item.location}`,
      });
      await prisma.agendaItem.update({ where: { id: item.id }, data: { reminded24h: true } });
    }
    if (!item.reminded2h && ms > 0 && ms <= 2 * 60 * 60_000) {
      await notifyAgenda(item.id, {
        kind: "upcoming-2h",
        audience: "hepsi",
        title: "Etkinlik 2 saat içinde başlıyor",
        body: `${item.title} · ${formatWhen(item.day.date, item.startTime, item.endTime)} · ${item.location}`,
      });
      await prisma.agendaItem.update({ where: { id: item.id }, data: { reminded2h: true } });
    }
  }
}

type NotifyOpts = {
  kind: string;
  audience: Audience;
  title: string;
  body: string;
};

async function recipientsFor(agendaId: string, audience: Audience) {
  const item = await prisma.agendaItem.findUnique({
    where: { id: agendaId },
    include: {
      signups: true,
      day: true,
    },
  });
  if (!item) return { item: null, people: [] as { email: string; name: string; role: string }[] };

  const people: { email: string; name: string; role: string }[] = [];
  const seen = new Set<string>();
  const push = (email: string, name: string, role: string) => {
    const key = email.trim().toLowerCase();
    if (!key.includes("@") || seen.has(key)) return;
    seen.add(key);
    people.push({ email: key, name, role });
  };

  for (const s of item.signups) {
    const ok =
      audience === "hepsi" ||
      (audience === "katilimci" && s.role !== "konusmaci") ||
      (audience === "konusmaci" && s.role === "konusmaci");
    if (ok) push(s.email, s.fullName, s.role);
  }

  if (audience !== "katilimci" && item.panelId) {
    const panel = await prisma.panel.findUnique({
      where: { id: item.panelId },
      include: { participants: { include: { person: true } } },
    });
    for (const row of panel?.participants || []) {
      push(row.person.email, row.person.name, "konusmaci");
    }
  }

  return { item, people };
}

export async function notifyAgenda(agendaId: string, opts: NotifyOpts) {
  const { item, people } = await recipientsFor(agendaId, opts.audience);
  if (!item) return { sent: 0 };

  let sent = 0;
  for (const person of people) {
    await prisma.agendaNotice.create({
      data: {
        agendaId,
        email: person.email,
        title: opts.title,
        body: opts.body,
        kind: opts.kind,
      },
    });
    await sendMail(
      person.email,
      `COP31 · ${opts.title}`,
      `Merhaba ${person.name || ""},\n\n${opts.body}\n\nSağlık Pavilionu · Yeşil Alan\nKayıt: /g/${agendaId}\n`
    );
    const user = await prisma.user.findUnique({ where: { email: person.email } });
    if (user) {
      await prisma.inboxItem.create({
        data: {
          userId: user.id,
          title: opts.title,
          body: opts.body,
        },
      });
    }
    sent += 1;
  }

  memoClear("public-program");
  broadcast({ type: "inbox", payload: { agendaId, kind: opts.kind } });
  broadcast({ type: "agenda" });
  try {
    const { notifyAgendaFollowers } = await import("./visitor-app");
    await notifyAgendaFollowers(agendaId, opts.title, opts.body);
  } catch {
    /* telefon uygulaması henüz hazır değilse e-posta akışı sürer */
  }
  return { sent };
}

export async function notifyScheduleChange(
  before: { title: string; startTime: string; endTime: string; location: string; date: string },
  afterId: string
) {
  const after = await prisma.agendaItem.findUnique({
    where: { id: afterId },
    include: { day: true },
  });
  if (!after) return;
  const changed =
    before.startTime !== after.startTime ||
    before.endTime !== after.endTime ||
    before.location !== after.location ||
    before.date !== after.day.date ||
    before.title !== after.title;
  if (!changed) return;
  await prisma.agendaItem.update({
    where: { id: afterId },
    data: { reminded24h: false, reminded2h: false },
  });
  await notifyAgenda(afterId, {
    kind: "change",
    audience: "hepsi",
    title: "Program saati / tarihi değişti",
    body: `${after.title} yeni saat: ${formatWhen(after.day.date, after.startTime, after.endTime)} · ${after.location} (önceki: ${formatWhen(before.date, before.startTime, before.endTime)})`,
  });
}
