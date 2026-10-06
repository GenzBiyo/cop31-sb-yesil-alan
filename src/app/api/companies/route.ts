import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { ensureCompanyAccounts } from "@/lib/company-accounts";
import { stakeholderFor } from "@/lib/stakeholder-match";

export async function GET() {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (user.role === "FIRMA") {
    const company = await prisma.company.findUnique({
      where: { id: user.companyId || "" },
      include: { rules: true, submissions: { orderBy: { createdAt: "desc" } }, users: true },
    });
    return jsonOk(company ? [{ ...company, formHint: await stakeholderFor(company) }] : []);
  }
  const companies = await prisma.company.findMany({
    include: {
      rules: { select: { id: true, title: true, body: true, dueDate: true, status: true } },
      submissions: { select: { id: true, type: true, title: true, payload: true, quantity: true, reviewNote: true, status: true, eventDate: true } },
      users: { select: { id: true, email: true, name: true, accountStatus: true }, orderBy: { createdAt: "asc" } },
    },
    orderBy: { name: "asc" },
  });
  return jsonOk(companies);
}

const TR: Record<string, string> = {
  ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u",
  Ç: "c", Ğ: "g", İ: "i", Ö: "o", Ş: "s", Ü: "u",
};

function slugify(raw: string) {
  const base = raw
    .split("")
    .map((ch) => TR[ch] || ch)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36);
  return base || "firma";
}

async function uniqueSlug(name: string) {
  const base = slugify(name);
  let slug = base;
  for (let n = 2; n < 100; n++) {
    const taken = await prisma.company.findUnique({ where: { slug } });
    if (!taken) return slug;
    slug = `${base}-${n}`.slice(0, 40);
  }
  return `${base}-${Date.now().toString(36)}`.slice(0, 40);
}

export async function POST(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const body = await req.json();
  const name = String(body.name || "").trim();
  if (!name) return jsonError("Firma adı gerekli");
  const company = await prisma.company.create({
    data: {
      slug: await uniqueSlug(String(body.slug || name)),
      name,
      scope: body.scope || "Local",
      topic: body.topic || "",
      context: body.context || "",
      participationDates: body.participationDates || "",
      contribution: body.contribution || "",
      status: body.status || "Beklemede",
      booth: body.booth || "",
      contactName: body.contactName || "",
      contactEmail: body.contactEmail || "",
      contactPhone: body.contactPhone || "",
    },
  });
  await ensureCompanyAccounts();
  return jsonOk(company, 201);
}
