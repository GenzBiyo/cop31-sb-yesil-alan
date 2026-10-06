import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { broadcast } from "@/lib/realtime";
import { dropSlotsOutside } from "@/lib/meeting-slots";
import { formatParticipationDays } from "@/lib/participation";
import { cleanDelegation } from "@/lib/delegation";

const FIRM_EDITABLE = [
  "topic",
  "topicEn",
  "context",
  "contribution",
  "participationDates",
  "website",
  "contactName",
  "contactEmail",
  "contactPhone",
  "notes",
];

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const { id } = await ctx.params;
  if (user.role === "FIRMA" && user.companyId !== id) return jsonError("Yetkiniz yok", 403);
  const company = await prisma.company.findUnique({
    where: { id },
    include: { rules: true, submissions: { orderBy: { createdAt: "desc" } }, users: true },
  });
  if (!company) return jsonError("Firma bulunamadı", 404);
  return jsonOk(company);
}

/** Day picker list and delegation array arrive as JSON; both are stored as text. */
function structured(body: Record<string, unknown>) {
  const data: Record<string, string> = {};
  if (Array.isArray(body.participationDays)) data.participationDates = formatParticipationDays(body.participationDays.map(String));
  if (body.delegation !== undefined) {
    const list = cleanDelegation(body.delegation);
    const bad = list.find((d) => d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email));
    if (bad) throw new Error(`${bad.name}: geçerli bir e-posta yazın`);
    const incomplete = list.find((d) => !d.title || !d.duty);
    if (incomplete) throw new Error(`${incomplete.name}: unvan ve pavilyondaki görevini yazın`);
    data.delegation = JSON.stringify(list);
  }
  return data;
}

async function save(id: string, data: Record<string, unknown>) {
  const before = await prisma.company.findUnique({ where: { id }, select: { participationDates: true } });
  if (!before) throw new Error("Firma bulunamadı");
  const company = await prisma.company.update({ where: { id }, data });
  let slots = { removed: 0, kept: 0 };
  if (company.participationDates !== before.participationDates) {
    slots = await dropSlotsOutside(id, company.participationDates);
    broadcast({ type: "agenda" });
  }
  return { ...company, slots };
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const { id } = await ctx.params;
  const body = await req.json();
  try {
    if (user.role === "FIRMA") {
      if (user.companyId !== id) return jsonError("Yetkiniz yok", 403);
      const data: Record<string, string> = {};
      for (const key of FIRM_EDITABLE) {
        if (body[key] !== undefined) data[key] = String(body[key] ?? "").trim().slice(0, key === "context" || key === "contribution" ? 3000 : 300);
      }
      Object.assign(data, structured(body));
      if (data.website && !/^https?:\/\//i.test(data.website)) data.website = `https://${data.website}`;
      if (data.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contactEmail)) return jsonError("Geçerli bir e-posta yazın");
      return jsonOk(await save(id, data));
    }
    if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
    const rest = { ...body };
    delete rest.participationDays;
    delete rest.delegation;
    return jsonOk(await save(id, { ...rest, ...structured(body) }));
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Kaydedilemedi");
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const { id } = await ctx.params;
  const existing = await prisma.company.findUnique({ where: { id } });
  if (!existing) return jsonError("Firma bulunamadı", 404);
  await prisma.user.updateMany({ where: { companyId: id }, data: { companyId: null } });
  await prisma.company.delete({ where: { id } });
  return jsonOk({ ok: true });
}
