import webpush from "web-push";
import { prisma } from "./prisma";
import { broadcast } from "./realtime";
import { ensureEvents } from "./events-db";
import { ensureAgendaSlots } from "./agenda";
import { validEmail, validPhone } from "./agenda-time";

const DEMO_TAGS = [
  {
    code: "GIRIS",
    title: "Pavilion girişi",
    location: "Sağlık Pavilionu — Giriş",
    message:
      "COP31 Sağlık Pavilionuna hoş geldiniz. Gündemi bu uygulamadan takip edin, etkinliklere katılın ve sunum sırasında sorunuzu yazın.",
  },
  {
    code: "SAHNE",
    title: "Ana sahne",
    location: "Sağlık Pavilionu — Ana Sahne",
    message:
      "Ana sahneye geldiniz. Açık oturumda sorunuzu Soru sekmesinden iletin; sahneye alındığında telefonunuza haber düşer.",
  },
  {
    code: "SOLAKLAR",
    title: "Solaklar outdoor",
    location: "Solaklar sıfır atık köyü",
    message:
      "Solaklar sıfır atık köyündesiniz. Mataranızı doldurun, kompost alanını gezin. 11–12 Kasım programı Gündem sekmesinde.",
  },
  {
    code: "STAND",
    title: "Sağlık standı",
    location: "Sağlık Pavilionu — Stand",
    message:
      "Sağlıklı insan, sağlıklı gezegen. Bu standın mesajı telefonunuza düştü. Bildirimleri açarsanız salon anonsları da buraya gelir.",
  },
];

let vapidPromise: Promise<{ publicKey: string; privateKey: string }> | null = null;

export function validDeviceToken(token: string) {
  return /^[0-9a-f-]{16,80}$/i.test(token);
}

export async function vapidKeys() {
  if (!vapidPromise) vapidPromise = loadVapid();
  return vapidPromise;
}

async function loadVapid() {
  const [pub, priv] = await Promise.all([
    prisma.setting.findUnique({ where: { key: "vapid.public" } }),
    prisma.setting.findUnique({ where: { key: "vapid.private" } }),
  ]);
  if (pub?.value && priv?.value) {
    webpush.setVapidDetails("mailto:sggm@cop31.saglik.gov.tr", pub.value, priv.value);
    return { publicKey: pub.value, privateKey: priv.value };
  }
  const keys = webpush.generateVAPIDKeys();
  await prisma.setting.upsert({
    where: { key: "vapid.public" },
    update: { value: keys.publicKey },
    create: { key: "vapid.public", value: keys.publicKey },
  });
  await prisma.setting.upsert({
    where: { key: "vapid.private" },
    update: { value: keys.privateKey },
    create: { key: "vapid.private", value: keys.privateKey },
  });
  webpush.setVapidDetails("mailto:sggm@cop31.saglik.gov.tr", keys.publicKey, keys.privateKey);
  return { publicKey: keys.publicKey, privateKey: keys.privateKey };
}

export async function ensureTags() {
  const count = await prisma.pavilionTag.count();
  if (count > 0) return;
  await prisma.pavilionTag.createMany({ data: DEMO_TAGS });
}

export async function deviceFromToken(token: string) {
  if (!validDeviceToken(token)) return null;
  await ensureTags();
  return prisma.appDevice.upsert({
    where: { token },
    create: { token },
    update: {},
  });
}

async function pushTo(devices: { id: string; pushJson: string }[], title: string, body: string) {
  const targets = devices.filter((d) => d.pushJson);
  if (!targets.length) return;
  await vapidKeys();
  const payload = JSON.stringify({ title, body, url: "/u" });
  for (let i = 0; i < targets.length; i += 20) {
    await Promise.all(
      targets.slice(i, i + 20).map(async (device) => {
        try {
          await webpush.sendNotification(JSON.parse(device.pushJson), payload, { TTL: 60 * 60 });
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await prisma.appDevice.update({ where: { id: device.id }, data: { pushJson: "" } });
          }
        }
      })
    );
  }
}

export async function addNote(deviceId: string, title: string, body: string, kind: string, ref = "") {
  const note = await prisma.appNote.create({
    data: { deviceId, title, body, kind, ref },
  });
  const device = await prisma.appDevice.findUnique({ where: { id: deviceId } });
  if (device) await pushTo([device], title, body);
  broadcast({ type: "app" });
  return note;
}

export async function notifyDevices(deviceIds: string[] | "all", title: string, body: string, kind: string, ref = "") {
  const devices =
    deviceIds === "all"
      ? await prisma.appDevice.findMany()
      : await prisma.appDevice.findMany({ where: { id: { in: deviceIds } } });
  if (!devices.length) return 0;
  await prisma.appNote.createMany({
    data: devices.map((device) => ({
      deviceId: device.id,
      title,
      body,
      kind,
      ref,
    })),
  });
  await pushTo(devices, title, body);
  broadcast({ type: "app" });
  return devices.length;
}

export async function notifyAgendaFollowers(agendaId: string, title: string, body: string) {
  const joins = await prisma.appJoin.findMany({ where: { kind: "agenda", refId: agendaId } });
  const ids = [...new Set(joins.map((join) => join.deviceId))];
  if (!ids.length) return 0;
  return notifyDevices(ids, title, body, "agenda", agendaId);
}

export async function appState(deviceId: string) {
  await ensureTags();
  const existingEvents = await prisma.pavilionEvent.count();
  if (existingEvents === 0) await ensureEvents();
  await ensureAgendaSlots();

  const deviceRow = await prisma.appDevice.findUnique({ where: { id: deviceId } });
  if (!deviceRow) return null;
  const answerable = await answerableAgendaIds(deviceRow);

  const [device, days, events, notes, joins, questions, keys, companies, speakers, meetingRows] = await Promise.all([
    prisma.appDevice.findUnique({ where: { id: deviceId } }),
    prisma.thematicDay.findMany({
      include: { agenda: { orderBy: [{ startTime: "asc" }, { sortOrder: "asc" }] } },
      orderBy: { date: "asc" },
    }),
    prisma.pavilionEvent.findMany({
      where: { published: true },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    }),
    prisma.appNote.findMany({
      where: { deviceId },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.appJoin.findMany({ where: { deviceId }, orderBy: { createdAt: "desc" } }),
    prisma.sessionQuestion.findMany({
      where: {
        OR: [
          { deviceId },
          { status: { in: ["Sahnede", "Yanıtlandı"] } },
          ...(answerable.length ? [{ agendaId: { in: answerable } }] : []),
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 80,
      include: { device: { select: { organization: true } } },
    }),
    vapidKeys(),
    prisma.company.findMany({
      where: { status: "Onaylandı" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.person.findMany({
      where: { OR: [{ kind: "speaker" }, { panels: { some: {} } }] },
      orderBy: { name: "asc" },
      select: { id: true, name: true, organization: true },
    }),
    prisma.meetingRequest.findMany({
      where: { OR: await meetingVisibility(deviceRow) },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { fromDevice: { select: { id: true, name: true, organization: true, role: true } } },
    }),
  ]);
  if (!device) return null;
  const fromIds = await samePartyIds(device);

  return {
    device: {
      name: device.name,
      email: device.email,
      phone: device.phone,
      organization: device.organization,
      role: device.role,
      companyId: device.companyId,
      personId: device.personId,
      push: Boolean(device.pushJson),
    },
    directory: { companies, speakers },
    vapidPublicKey: keys.publicKey,
    days: days.map((day) => ({
      id: day.id,
      date: day.date,
      theme: day.themeTr,
      agenda: day.agenda.map((item) => ({
        id: item.id,
        title: item.title,
        type: item.type,
        startTime: item.startTime,
        endTime: item.endTime,
        location: item.location,
        description: item.description,
        status: item.status,
      })),
    })),
    events: events.map((event) => ({
      id: event.id,
      slug: event.slug,
      title: event.title,
      type: event.type,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
      description: event.description,
    })),
    notes,
    unread: notes.filter((note) => !note.read).length,
    joins: joins.map((join) => ({ kind: join.kind, refId: join.refId, title: join.title })),
    questions: questions.map((question) => ({
      id: question.id,
      agendaId: question.agendaId,
      sessionTitle: question.sessionTitle,
      author: question.author,
      authorRole: question.authorRole,
      organization: question.device.organization,
      body: question.body,
      status: question.status,
      answer: question.answer,
      createdAt: question.createdAt,
      mine: question.deviceId === deviceId,
      canAnswer: answerable.includes(question.agendaId),
    })),
    meetings: meetingRows.map((meeting) => presentMeeting(meeting, deviceId, fromIds)),
  };
}

export async function saveProfile(
  deviceId: string,
  input: { name: string; email: string; phone: string; organization: string; role?: string; companyId?: string; personId?: string }
) {
  const name = input.name.trim().slice(0, 80);
  const email = input.email.trim().toLowerCase().slice(0, 120);
  const phone = input.phone.trim().slice(0, 30);
  let organization = input.organization.trim().slice(0, 120);
  const role = input.role === "firma" || input.role === "konusmaci" ? input.role : "ziyaretci";
  if (name.length < 2) throw new Error("Ad soyad gerekli");
  if (email && !validEmail(email)) throw new Error("E-posta geçersiz");
  if (phone && !validPhone(phone)) throw new Error("Telefon en az 10 hane olmalı");

  let companyId = "";
  let personId = "";
  if (role === "firma") {
    const company = await prisma.company.findFirst({ where: { id: String(input.companyId || ""), status: "Onaylandı" } });
    if (!company) throw new Error("Firma seçin");
    companyId = company.id;
    if (!organization) organization = company.name;
  }
  if (role === "konusmaci") {
    const person = await prisma.person.findUnique({ where: { id: String(input.personId || "") } });
    if (!person) throw new Error("Konuşmacı kaydınızı seçin");
    personId = person.id;
    if (!organization) organization = person.organization;
  }

  const device = await prisma.appDevice.update({
    where: { id: deviceId },
    data: { name, email, phone, organization, role, companyId, personId },
  });
  const welcome = await prisma.appNote.findFirst({ where: { deviceId, ref: "welcome" } });
  if (!welcome) {
    await addNote(
      deviceId,
      "Hoş geldiniz",
      `${name}, COP31 Sağlık Bakanlığı uygulamasındasınız. Sunumda soru sorun, ikili görüşme veya toplantı talebi bırakın. Kabul edilen görüşmenin saatini buradan güncelleyebilirsiniz.`,
      "system",
      "welcome"
    );
  }
  return device;
}

export function parseTagCode(raw: string) {
  const text = raw.trim();
  const fromPath = text.match(/etiket\/([A-Za-z0-9-]{3,32})/i);
  if (fromPath) return fromPath[1].toUpperCase();
  const plain = text.toUpperCase().replace(/[^A-Z0-9-]/g, "");
  if (plain.length >= 3 && plain.length <= 32) return plain;
  return "";
}

export async function scanTag(deviceId: string, rawCode: string) {
  const clean = parseTagCode(rawCode);
  if (!clean) throw new Error("Etiket kodu okunamadı");
  const tag = await prisma.pavilionTag.findUnique({ where: { code: clean } });
  if (!tag || !tag.active) throw new Error("Etiket bulunamadı");

  await prisma.tagScan.create({ data: { tagId: tag.id, deviceId } });
  const ref = `tag:${tag.id}`;
  const existing = await prisma.appNote.findFirst({ where: { deviceId, ref, kind: "tag" } });
  if (existing) {
    await prisma.appNote.update({
      where: { id: existing.id },
      data: { title: tag.title, body: tag.message, read: false, createdAt: new Date() },
    });
  } else {
    await addNote(deviceId, tag.title, tag.message, "tag", ref);
  }
  const device = await prisma.appDevice.findUnique({ where: { id: deviceId } });
  if (device?.pushJson && existing) await pushTo([device], tag.title, tag.message);
  broadcast({ type: "app" });
  return { title: tag.title, message: tag.message, location: tag.location, already: Boolean(existing) };
}

export async function toggleJoin(deviceId: string, kind: "agenda" | "event", refId: string, on: boolean) {
  if (kind !== "agenda" && kind !== "event") throw new Error("Katılım türü geçersiz");
  const device = await prisma.appDevice.findUnique({ where: { id: deviceId } });
  if (!device) throw new Error("Cihaz yok");
  if (!device.name) throw new Error("Önce adınızı kaydedin");

  if (!on) {
    await prisma.appJoin.deleteMany({ where: { deviceId, kind, refId } });
    return { joined: false };
  }

  let title = "";
  if (kind === "agenda") {
    const item = await prisma.agendaItem.findUnique({ where: { id: refId }, include: { day: true } });
    if (!item) throw new Error("Oturum bulunamadı");
    title = `${item.day.date} ${item.startTime} · ${item.title}`;
    if (validEmail(device.email) && validPhone(device.phone)) {
      await prisma.agendaSignup.upsert({
        where: { agendaId_email: { agendaId: item.id, email: device.email } },
        update: { fullName: device.name, phone: device.phone, organization: device.organization, role: device.role === "konusmaci" ? "konusmaci" : "katilimci" },
        create: {
          agendaId: item.id,
          fullName: device.name,
          email: device.email,
          phone: device.phone,
          organization: device.organization,
          role: device.role === "konusmaci" ? "konusmaci" : "katilimci",
        },
      });
    }
  } else {
    const event = await prisma.pavilionEvent.findUnique({ where: { id: refId } });
    if (!event || !event.published) throw new Error("Etkinlik bulunamadı");
    title = `${event.date} ${event.startTime} · ${event.title}`;
  }

  await prisma.appJoin.upsert({
    where: { deviceId_kind_refId: { deviceId, kind, refId } },
    update: { title },
    create: { deviceId, kind, refId, title },
  });
  await addNote(deviceId, "Katılım alındı", title, "join", `${kind}:${refId}`);
  return { joined: true, title };
}

type PartyDevice = { id: string; role: string; companyId: string; personId: string };

async function samePartyIds(device: PartyDevice) {
  if (device.role === "firma" && device.companyId) {
    const rows = await prisma.appDevice.findMany({
      where: { role: "firma", companyId: device.companyId },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }
  if (device.role === "konusmaci" && device.personId) {
    const rows = await prisma.appDevice.findMany({
      where: { role: "konusmaci", personId: device.personId },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }
  return [device.id];
}

async function meetingVisibility(device: PartyDevice) {
  const fromIds = await samePartyIds(device);
  const or: object[] = [{ fromDeviceId: { in: fromIds } }];
  if (device.role === "firma" && device.companyId) or.push({ withKind: "firma", withId: device.companyId });
  if (device.role === "konusmaci" && device.personId) or.push({ withKind: "konusmaci", withId: device.personId });
  return or;
}

async function answerableAgendaIds(device: PartyDevice) {
  const ids = new Set<string>();
  if (device.role === "konusmaci" && device.personId) {
    const links = await prisma.panelPerson.findMany({ where: { personId: device.personId }, select: { panelId: true } });
    const panelIds = links.map((link) => link.panelId);
    if (panelIds.length) {
      const items = await prisma.agendaItem.findMany({ where: { panelId: { in: panelIds } }, select: { id: true } });
      items.forEach((item) => ids.add(item.id));
    }
  }
  if (device.role === "firma" && device.companyId) {
    const items = await prisma.agendaItem.findMany({ where: { companyId: device.companyId }, select: { id: true } });
    items.forEach((item) => ids.add(item.id));
  }
  return [...ids];
}

function presentMeeting(
  meeting: {
    id: string;
    fromDeviceId: string;
    kind: string;
    withKind: string;
    withId: string;
    withName: string;
    topic: string;
    message: string;
    preferredDate: string;
    preferredTime: string;
    status: string;
    whenDate: string;
    startTime: string;
    endTime: string;
    location: string;
    note: string;
    updatedAt: Date;
    fromDevice: { id: string; name: string; organization: string; role: string };
  },
  deviceId: string,
  fromIds: string[]
) {
  const outgoing = fromIds.includes(meeting.fromDeviceId);
  const incoming = !outgoing;
  return {
    id: meeting.id,
    kind: meeting.kind,
    withKind: meeting.withKind,
    withName: meeting.withName,
    topic: meeting.topic,
    message: meeting.message,
    preferredDate: meeting.preferredDate,
    preferredTime: meeting.preferredTime,
    status: meeting.status,
    whenDate: meeting.whenDate,
    startTime: meeting.startTime,
    endTime: meeting.endTime,
    location: meeting.location,
    note: meeting.note,
    fromName: meeting.fromDevice.name,
    fromOrganization: meeting.fromDevice.organization,
    fromRole: meeting.fromDevice.role,
    outgoing,
    incoming,
    canRespond: meeting.status === "Bekliyor" && incoming,
    canEdit: meeting.status === "Kabul" && (incoming || outgoing),
    updatedAt: meeting.updatedAt,
  };
}

async function partyDeviceIds(meeting: { fromDeviceId: string; withKind: string; withId: string }, exceptId?: string) {
  const ids = new Set<string>([meeting.fromDeviceId]);
  if (meeting.withKind === "firma" && meeting.withId) {
    const rows = await prisma.appDevice.findMany({ where: { role: "firma", companyId: meeting.withId }, select: { id: true } });
    rows.forEach((row) => ids.add(row.id));
  }
  if (meeting.withKind === "konusmaci" && meeting.withId) {
    const rows = await prisma.appDevice.findMany({ where: { role: "konusmaci", personId: meeting.withId }, select: { id: true } });
    rows.forEach((row) => ids.add(row.id));
  }
  if (exceptId) ids.delete(exceptId);
  return [...ids];
}

export async function notifySessionHosts(agendaId: string, title: string, body: string, exceptDeviceId: string) {
  const item = await prisma.agendaItem.findUnique({ where: { id: agendaId } });
  if (!item) return;
  const ids = new Set<string>();
  if (item.panelId) {
    const people = await prisma.panelPerson.findMany({ where: { panelId: item.panelId }, select: { personId: true } });
    const personIds = people.map((person) => person.personId);
    if (personIds.length) {
      const devices = await prisma.appDevice.findMany({
        where: { role: "konusmaci", personId: { in: personIds } },
        select: { id: true },
      });
      devices.forEach((row) => ids.add(row.id));
    }
  }
  if (item.companyId) {
    const devices = await prisma.appDevice.findMany({
      where: { role: "firma", companyId: item.companyId },
      select: { id: true },
    });
    devices.forEach((row) => ids.add(row.id));
  }
  ids.delete(exceptDeviceId);
  if (ids.size) await notifyDevices([...ids], title, body, "question", agendaId);
}

export async function answerSessionQuestion(deviceId: string, questionId: string, answer: string) {
  const device = await prisma.appDevice.findUnique({ where: { id: deviceId } });
  if (!device) throw new Error("Cihaz yok");
  const allowed = await answerableAgendaIds(device);
  const question = await prisma.sessionQuestion.findUnique({ where: { id: questionId } });
  if (!question) throw new Error("Soru yok");
  if (!allowed.includes(question.agendaId)) throw new Error("Bu oturumun sorusunu yanıtlayamazsınız");
  const text = answer.trim().slice(0, 600);
  if (text.length < 2) throw new Error("Yanıtı yazın");
  await prisma.sessionQuestion.update({
    where: { id: questionId },
    data: { answer: text, status: "Yanıtlandı" },
  });
  if (question.deviceId !== deviceId) {
    await addNote(question.deviceId, "Sorunuza yanıt", text, "question", question.id);
  }
  broadcast({ type: "app" });
}

export async function createMeeting(
  deviceId: string,
  input: { kind: string; withKind: string; withId: string; topic: string; message: string; preferredDate: string; preferredTime: string }
) {
  const device = await prisma.appDevice.findUnique({ where: { id: deviceId } });
  if (!device?.name) throw new Error("Önce adınızı kaydedin");
  const kind = input.kind === "toplanti" ? "toplanti" : "ikili";
  const withKind = input.withKind === "firma" || input.withKind === "konusmaci" ? input.withKind : "bakanlik";
  const topic = input.topic.trim().slice(0, 140);
  const message = input.message.trim().slice(0, 500);
  if (topic.length < 3) throw new Error("Görüşme konusunu yazın");

  let withId = "";
  let withName = "T.C. Sağlık Bakanlığı";
  if (withKind === "firma") {
    const company = await prisma.company.findFirst({ where: { id: input.withId, status: "Onaylandı" } });
    if (!company) throw new Error("Firma seçin");
    if (device.role === "firma" && device.companyId === company.id) throw new Error("Kendi firmanızla görüşme açamazsınız");
    withId = company.id;
    withName = company.name;
  }
  if (withKind === "konusmaci") {
    const person = await prisma.person.findUnique({ where: { id: input.withId } });
    if (!person) throw new Error("Konuşmacı seçin");
    if (device.role === "konusmaci" && device.personId === person.id) throw new Error("Kendinizle görüşme açamazsınız");
    withId = person.id;
    withName = person.organization ? `${person.name} · ${person.organization}` : person.name;
  }

  const meeting = await prisma.meetingRequest.create({
    data: {
      fromDeviceId: device.id,
      kind,
      withKind,
      withId,
      withName,
      topic,
      message,
      preferredDate: input.preferredDate.trim().slice(0, 10),
      preferredTime: input.preferredTime.trim().slice(0, 5),
    },
  });
  const label = kind === "ikili" ? "İkili görüşme" : "Toplantı";
  await addNote(device.id, "Talebiniz iletildi", `${label}: ${withName} — ${topic}`, "meeting", meeting.id);
  const targets = (await partyDeviceIds(meeting, device.id)).filter((id) => id !== device.id);
  if (targets.length) {
    await notifyDevices(targets, `Yeni ${label.toLowerCase()} talebi`, `${device.name}: ${topic}`, "meeting", meeting.id);
  }
  return meeting;
}

export async function updateMeeting(
  actor: string | "staff",
  id: string,
  input: { status?: string; whenDate?: string; startTime?: string; endTime?: string; location?: string; note?: string }
) {
  const meeting = await prisma.meetingRequest.findUnique({ where: { id } });
  if (!meeting) throw new Error("Talep yok");

  let canRespond = false;
  let canEdit = false;
  if (actor === "staff") {
    canRespond = true;
    canEdit = true;
  } else {
    const device = await prisma.appDevice.findUnique({ where: { id: actor } });
    if (!device) throw new Error("Cihaz yok");
    const fromIds = await samePartyIds(device);
    const outgoing = fromIds.includes(meeting.fromDeviceId);
    const incoming =
      !outgoing &&
      ((device.role === "firma" && meeting.withKind === "firma" && meeting.withId === device.companyId) ||
        (device.role === "konusmaci" && meeting.withKind === "konusmaci" && meeting.withId === device.personId));
    canRespond = meeting.status === "Bekliyor" && incoming;
    canEdit = meeting.status === "Kabul" && (incoming || outgoing);
  }

  const data: {
    status?: string;
    whenDate?: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    note?: string;
  } = {};
  const nextStatus = input.status === "Kabul" || input.status === "Red" ? input.status : "";
  if (nextStatus && meeting.status === "Bekliyor") {
    if (!canRespond && actor !== "staff") throw new Error("Bu talebi yanıtlayamazsınız");
    data.status = nextStatus;
    if (nextStatus === "Kabul") {
      data.whenDate = meeting.preferredDate;
      data.startTime = meeting.preferredTime;
      data.location = meeting.kind === "ikili" ? "Sağlık Pavilionu — İkili görüşme masası" : "Sağlık Pavilionu";
    }
  } else if (nextStatus && actor === "staff") {
    data.status = nextStatus;
  } else if (nextStatus) {
    throw new Error("Yalnızca bekleyen talep kabul veya red edilir");
  }

  const scheduleOpen = meeting.status === "Kabul" || data.status === "Kabul";
  if (scheduleOpen && (canEdit || data.status === "Kabul" || actor === "staff")) {
    if (!canEdit && actor !== "staff" && data.status !== "Kabul") throw new Error("Kabul edilen görüşme düzenlenir");
    if (input.whenDate != null) data.whenDate = String(input.whenDate).trim().slice(0, 10);
    if (input.startTime != null) data.startTime = String(input.startTime).trim().slice(0, 5);
    if (input.endTime != null) data.endTime = String(input.endTime).trim().slice(0, 5);
    if (input.location != null) data.location = String(input.location).trim().slice(0, 140);
    if (input.note != null) data.note = String(input.note).trim().slice(0, 400);
  }

  if (!Object.keys(data).length) throw new Error("Değişiklik yok");
  const saved = await prisma.meetingRequest.update({ where: { id }, data });
  const when = [saved.whenDate, saved.startTime && saved.endTime ? `${saved.startTime}–${saved.endTime}` : saved.startTime, saved.location]
    .filter(Boolean)
    .join(" · ");
  const title = data.status === "Red" ? "Görüşme reddedildi" : data.status === "Kabul" ? "Görüşme kabul edildi" : "Görüşme güncellendi";
  const body = `${saved.withName}: ${saved.topic}${when ? ` — ${when}` : ""}`;
  const except = actor === "staff" ? undefined : actor;
  const listeners = await partyDeviceIds(saved, except);
  if (listeners.length) await notifyDevices(listeners, title, body, "meeting", saved.id);
  broadcast({ type: "app" });
  return saved;
}
