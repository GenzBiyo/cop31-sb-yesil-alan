import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { isAmbassadorAccepted } from "./ambassador-card";

const STATUSES = ["Bekliyor", "Devam ediyor", "Tamamlandı"] as const;
const ACCEPTED = ["Kabul edildi", "Yerleştirildi"];

export class DeskError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function clip(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

function amountOf(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new DeskError("Miktar 0 veya daha büyük olmalı");
  return Math.min(1_000_000, Math.round(n));
}

function statusOf(value: unknown, fallback: string) {
  const s = String(value ?? "");
  return (STATUSES as readonly string[]).includes(s) ? s : fallback;
}

function idsOf(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((id) => String(id || "").trim()).filter(Boolean))];
}

async function acceptedIds(ids: string[]) {
  if (!ids.length) return [];
  const rows = await prisma.ambassadorApplication.findMany({
    where: { id: { in: ids }, status: { in: ACCEPTED } },
    select: { id: true },
  });
  const ok = new Set(rows.map((row) => row.id));
  return ids.filter((id) => ok.has(id));
}

function mapMessage(
  row: {
    id: string;
    body: string;
    createdAt: Date;
    fromAdmin: boolean;
    applicationId: string | null;
    application: { fullName: string } | null;
  },
  viewerId?: string
) {
  const mine = viewerId
    ? Boolean(row.applicationId && row.applicationId === viewerId && !row.fromAdmin)
    : !row.fromAdmin;
  return {
    id: row.id,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    fromAdmin: row.fromAdmin,
    mine,
    author: row.fromAdmin ? "Yönetim" : row.application?.fullName || "Elçi",
  };
}

async function messagesFor(where: Prisma.ElciMessageWhereInput, viewerId?: string) {
  const rows = await prisma.elciMessage.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 120,
    include: { application: { select: { fullName: true } } },
  });
  return rows.reverse().map((row) => mapMessage(row, viewerId));
}

export async function loadAdminDesk(query: { grup?: string; kisi?: string }) {
  const [people, groups, tasks, logs] = await Promise.all([
    prisma.ambassadorApplication.findMany({
      where: { status: { in: ACCEPTED } },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, school: true, city: true, email: true },
    }),
    prisma.elciGroup.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        members: {
          include: { application: { select: { id: true, fullName: true, school: true } } },
          orderBy: { createdAt: "asc" },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { body: true, createdAt: true },
        },
      },
    }),
    prisma.elciTask.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        group: { select: { name: true } },
        work: {
          include: { application: { select: { fullName: true, school: true } } },
          orderBy: { updatedAt: "desc" },
        },
      },
    }),
    prisma.elciTaskLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        task: { select: { title: true, unit: true } },
        application: { select: { fullName: true } },
      },
    }),
  ]);

  const directs = await prisma.elciMessage.findMany({
    where: { groupId: null, peerId: null, applicationId: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 400,
    select: { applicationId: true, body: true, createdAt: true },
  });
  const lastDirect = new Map<string, { body: string; createdAt: string }>();
  for (const row of directs) {
    if (row.applicationId && !lastDirect.has(row.applicationId)) {
      lastDirect.set(row.applicationId, { body: row.body, createdAt: row.createdAt.toISOString() });
    }
  }

  let messages: ReturnType<typeof mapMessage>[] = [];
  let thread = "";
  if (query.grup) {
    messages = await messagesFor({ groupId: query.grup });
    thread = `grup:${query.grup}`;
  } else if (query.kisi) {
    messages = await messagesFor({ groupId: null, peerId: null, applicationId: query.kisi });
    thread = `kisi:${query.kisi}`;
  }

  return {
    people: people.map((person) => {
      const last = lastDirect.get(person.id);
      return {
        id: person.id,
        fullName: person.fullName,
        school: person.school || person.city,
        email: person.email,
        lastBody: last?.body || "",
        lastAt: last?.createdAt || "",
      };
    }),
    groups: groups.map((group) => ({
      id: group.id,
      name: group.name,
      memberIds: group.members.map((member) => member.applicationId),
      members: group.members.map((member) => ({
        id: member.application.id,
        fullName: member.application.fullName,
        school: member.application.school,
      })),
      lastBody: group.messages[0]?.body || "",
      lastAt: group.messages[0]?.createdAt.toISOString() || "",
    })),
    tasks: tasks.map((task) => ({
      id: task.id,
      title: task.title,
      detail: task.detail,
      unit: task.unit,
      target: task.target,
      groupName: task.group?.name || "",
      createdAt: task.createdAt.toISOString(),
      done: task.work.filter((row) => row.status === "Tamamlandı").length,
      totalAmount: task.work.reduce((sum, row) => sum + row.amount, 0),
      work: task.work.map((row) => ({
        id: row.id,
        applicationId: row.applicationId,
        name: row.application.fullName,
        school: row.application.school,
        amount: row.amount,
        note: row.note,
        status: row.status,
        updatedAt: row.updatedAt.toISOString(),
      })),
    })),
    logs: logs.map((log) => ({
      id: log.id,
      name: log.application.fullName,
      title: log.task.title,
      unit: log.task.unit,
      amount: log.amount,
      note: log.note,
      status: log.status,
      createdAt: log.createdAt.toISOString(),
    })),
    messages,
    thread,
  };
}

async function requireGroup(id: string) {
  const group = await prisma.elciGroup.findUnique({ where: { id } });
  if (!group) throw new DeskError("Grup bulunamadı", 404);
  return group;
}

export async function actAdmin(body: Record<string, unknown>) {
  const action = String(body.action || "");

  if (action === "createGroup") {
    const name = clip(body.name, 80);
    if (!name) throw new DeskError("Grup adı gerekli");
    const memberIds = await acceptedIds(idsOf(body.memberIds));
    const group = await prisma.elciGroup.create({
      data: {
        name,
        members: { create: memberIds.map((applicationId) => ({ applicationId })) },
      },
    });
    return { ok: true, groupId: group.id };
  }

  if (action === "renameGroup") {
    const groupId = clip(body.groupId, 40);
    const name = clip(body.name, 80);
    if (!name) throw new DeskError("Grup adı gerekli");
    await requireGroup(groupId);
    await prisma.elciGroup.update({ where: { id: groupId }, data: { name } });
    return { ok: true };
  }

  if (action === "deleteGroup") {
    const groupId = clip(body.groupId, 40);
    await requireGroup(groupId);
    await prisma.elciGroup.delete({ where: { id: groupId } });
    return { ok: true };
  }

  if (action === "setMembers") {
    const groupId = clip(body.groupId, 40);
    await requireGroup(groupId);
    const memberIds = await acceptedIds(idsOf(body.memberIds));
    await prisma.$transaction([
      prisma.elciGroupMember.deleteMany({ where: { groupId } }),
      ...(memberIds.length
        ? [prisma.elciGroupMember.createMany({ data: memberIds.map((applicationId) => ({ groupId, applicationId })) })]
        : []),
    ]);
    return { ok: true };
  }

  if (action === "send") {
    const text = clip(body.body, 2000);
    if (!text) throw new DeskError("Mesaj boş olamaz");
    const groupId = clip(body.groupId, 40);
    const applicationId = clip(body.applicationId, 40);
    if (groupId) {
      await requireGroup(groupId);
      await prisma.elciMessage.create({ data: { groupId, fromAdmin: true, body: text } });
      return { ok: true };
    }
    if (!applicationId) throw new DeskError("Alıcı seçin");
    const person = await prisma.ambassadorApplication.findUnique({ where: { id: applicationId } });
    if (!person || !isAmbassadorAccepted(person.status)) throw new DeskError("Elçi bulunamadı", 404);
    await prisma.elciMessage.create({ data: { applicationId, fromAdmin: true, body: text } });
    return { ok: true };
  }

  if (action === "broadcast") {
    const text = clip(body.body, 2000);
    if (!text) throw new DeskError("Mesaj boş olamaz");
    const people = await prisma.ambassadorApplication.findMany({
      where: { status: { in: ACCEPTED } },
      select: { id: true },
    });
    if (!people.length) throw new DeskError("Kabul edilmiş elçi yok");
    await prisma.elciMessage.createMany({
      data: people.map((person) => ({ applicationId: person.id, fromAdmin: true, body: text })),
    });
    return { ok: true, count: people.length };
  }

  if (action === "createTask") {
    const title = clip(body.title, 140);
    if (!title) throw new DeskError("Görev başlığı gerekli");
    const detail = clip(body.detail, 2000);
    const unit = clip(body.unit, 24) || "adet";
    const target = amountOf(body.target ?? 0);
    const groupId = clip(body.groupId, 40);
    let ids = await acceptedIds(idsOf(body.applicationIds));
    if (groupId) {
      await requireGroup(groupId);
      const members = await prisma.elciGroupMember.findMany({ where: { groupId }, select: { applicationId: true } });
      const fromGroup = await acceptedIds(members.map((member) => member.applicationId));
      ids = [...new Set([...fromGroup, ...ids])];
    }
    if (!ids.length) throw new DeskError("Görevi en az bir elçiye verin");
    const task = await prisma.elciTask.create({
      data: {
        title,
        detail,
        unit,
        target,
        groupId: groupId || null,
        work: { create: ids.map((applicationId) => ({ applicationId })) },
      },
    });
    return { ok: true, taskId: task.id };
  }

  if (action === "deleteTask") {
    const taskId = clip(body.taskId, 40);
    const task = await prisma.elciTask.findUnique({ where: { id: taskId } });
    if (!task) throw new DeskError("Görev bulunamadı", 404);
    await prisma.elciTask.delete({ where: { id: taskId } });
    return { ok: true };
  }

  if (action === "adjust") {
    const workId = clip(body.workId, 40);
    const work = await prisma.elciTaskWork.findUnique({ where: { id: workId } });
    if (!work) throw new DeskError("Görev kaydı bulunamadı", 404);
    const amount = amountOf(body.amount);
    const note = clip(body.note, 500);
    const status = statusOf(body.status, work.status);
    await prisma.$transaction([
      prisma.elciTaskWork.update({ where: { id: work.id }, data: { amount, note, status } }),
      prisma.elciTaskLog.create({
        data: { taskId: work.taskId, applicationId: work.applicationId, amount, note, status },
      }),
    ]);
    return { ok: true };
  }

  throw new DeskError("Bilinmeyen işlem");
}

async function requireElci(applicationId: string) {
  const me = await prisma.ambassadorApplication.findUnique({ where: { id: applicationId } });
  if (!me || !isAmbassadorAccepted(me.status)) throw new DeskError("Kabul kaydı yok", 403);
  return me;
}

export async function loadElciDesk(applicationId: string, query: { grup?: string; yonetim?: string; kisi?: string }) {
  const me = await requireElci(applicationId);
  const peers = await prisma.ambassadorApplication.findMany({
    where: { status: { in: ACCEPTED }, id: { not: me.id } },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, school: true, city: true },
  });
  const memberships = await prisma.elciGroupMember.findMany({
    where: { applicationId: me.id },
    include: {
      group: {
        include: {
          messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, createdAt: true } },
          members: { select: { id: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  const work = await prisma.elciTaskWork.findMany({
    where: { applicationId: me.id },
    include: { task: true },
    orderBy: { updatedAt: "desc" },
  });

  let messages: ReturnType<typeof mapMessage>[] = [];
  let thread = "";
  if (query.grup) {
    const member = memberships.find((row) => row.groupId === query.grup);
    if (member) {
      messages = await messagesFor({ groupId: query.grup }, me.id);
      thread = `grup:${query.grup}`;
    }
  } else if (query.yonetim) {
    messages = await messagesFor({ groupId: null, peerId: null, applicationId: me.id }, me.id);
    thread = "yonetim";
  } else if (query.kisi && query.kisi !== me.id) {
    const peer = peers.find((row) => row.id === query.kisi);
    if (peer) {
      messages = await messagesFor(
        {
          groupId: null,
          OR: [
            { applicationId: me.id, peerId: peer.id },
            { applicationId: peer.id, peerId: me.id },
          ],
        },
        me.id
      );
      thread = `kisi:${peer.id}`;
    }
  }

  return {
    me: { id: me.id, name: me.fullName, school: me.school || me.city },
    peers: peers.map((row) => ({ id: row.id, name: row.fullName, school: row.school || row.city })),
    groups: memberships.map((row) => ({
      id: row.group.id,
      name: row.group.name,
      size: row.group.members.length,
      lastBody: row.group.messages[0]?.body || "",
      lastAt: row.group.messages[0]?.createdAt.toISOString() || "",
    })),
    tasks: work.map((row) => ({
      assignmentId: row.id,
      title: row.task.title,
      detail: row.task.detail,
      unit: row.task.unit,
      target: row.task.target,
      amount: row.amount,
      note: row.note,
      status: row.status,
      updatedAt: row.updatedAt.toISOString(),
    })),
    messages,
    thread,
  };
}

export async function actElci(applicationId: string, body: Record<string, unknown>) {
  const me = await requireElci(applicationId);
  const action = String(body.action || "");

  if (action === "send") {
    const text = clip(body.body, 2000);
    if (!text) throw new DeskError("Mesaj boş olamaz");
    const groupId = clip(body.groupId, 40);
    const peerId = clip(body.peerId, 40);
    if (groupId) {
      const member = await prisma.elciGroupMember.findUnique({
        where: { groupId_applicationId: { groupId, applicationId: me.id } },
      });
      if (!member) throw new DeskError("Bu grupta değilsiniz", 403);
      await prisma.elciMessage.create({ data: { groupId, applicationId: me.id, fromAdmin: false, body: text } });
      return { ok: true };
    }
    if (peerId) {
      if (peerId === me.id) throw new DeskError("Kendinize yazamazsınız");
      const peer = await prisma.ambassadorApplication.findUnique({ where: { id: peerId } });
      if (!peer || !isAmbassadorAccepted(peer.status)) throw new DeskError("Elçi bulunamadı", 404);
      await prisma.elciMessage.create({ data: { applicationId: me.id, peerId, fromAdmin: false, body: text } });
      return { ok: true };
    }
    await prisma.elciMessage.create({ data: { applicationId: me.id, fromAdmin: false, body: text } });
    return { ok: true };
  }

  if (action === "report") {
    const assignmentId = clip(body.assignmentId, 40);
    const work = await prisma.elciTaskWork.findFirst({ where: { id: assignmentId, applicationId: me.id } });
    if (!work) throw new DeskError("Görev bulunamadı", 404);
    const amount = amountOf(body.amount);
    const note = clip(body.note, 500);
    const status = statusOf(body.status, work.status);
    await prisma.$transaction([
      prisma.elciTaskWork.update({ where: { id: work.id }, data: { amount, note, status } }),
      prisma.elciTaskLog.create({
        data: { taskId: work.taskId, applicationId: me.id, amount, note, status },
      }),
    ]);
    return { ok: true };
  }

  throw new DeskError("Bilinmeyen işlem");
}
