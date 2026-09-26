import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { ensureTags } from "@/lib/visitor-app";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, error } = await withUser();
  if (error || !user) return error;
  if (!canManage(user.role)) return jsonError("Yetki yok", 403);
  await ensureTags();

  const [tags, questions, devices, scans, joins, recent, meetings] = await Promise.all([
    prisma.pavilionTag.findMany({ orderBy: { createdAt: "asc" }, include: { _count: { select: { scans: true } } } }),
    prisma.sessionQuestion.findMany({
      orderBy: { createdAt: "desc" },
      take: 80,
      include: { device: { select: { name: true, organization: true, email: true } } },
    }),
    prisma.appDevice.count(),
    prisma.tagScan.count(),
    prisma.appJoin.count(),
    prisma.tagScan.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { tag: true, device: { select: { name: true, organization: true } } },
    }),
    prisma.meetingRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 60,
      include: { fromDevice: { select: { name: true, organization: true, role: true } } },
    }),
  ]);
  const pushEnabled = await prisma.appDevice.count({ where: { NOT: { pushJson: "" } } });

  return jsonOk({
    tags: tags.map((tag) => ({
      id: tag.id,
      code: tag.code,
      title: tag.title,
      message: tag.message,
      location: tag.location,
      active: tag.active,
      scans: tag._count.scans,
    })),
    questions: questions.map((question) => ({
      id: question.id,
      agendaId: question.agendaId,
      sessionTitle: question.sessionTitle,
      author: question.author,
      organization: question.device.organization,
      email: question.device.email,
      body: question.body,
      status: question.status,
      answer: question.answer,
      createdAt: question.createdAt,
    })),
    recent: recent.map((scan) => ({
      id: scan.id,
      code: scan.tag.code,
      title: scan.tag.title,
      name: scan.device.name || "İsimsiz",
      organization: scan.device.organization,
      createdAt: scan.createdAt,
    })),
    meetings: meetings.map((meeting) => ({
      id: meeting.id,
      kind: meeting.kind,
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
      updatedAt: meeting.updatedAt,
    })),
    stats: { devices, pushEnabled, scans, joins, meetings: meetings.length },
  });
}
