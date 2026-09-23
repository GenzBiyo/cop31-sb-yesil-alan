import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";

export async function GET() {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (user.role === "FIRMA") {
    const company = await prisma.company.findUnique({
      where: { id: user.companyId || "" },
      include: { rules: true, submissions: { orderBy: { createdAt: "desc" } }, users: true },
    });
    return jsonOk(company ? [company] : []);
  }
  const companies = await prisma.company.findMany({
    include: { rules: true, submissions: true, users: true },
    orderBy: { name: "asc" },
  });
  return jsonOk(companies);
}

export async function POST(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const body = await req.json();
  const company = await prisma.company.create({
    data: {
      slug: (body.slug || body.name || "firma")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 40),
      name: body.name,
      scope: body.scope || "Local",
      topic: body.topic || "",
      context: body.context || "",
      participationDates: body.participationDates || "",
      contribution: body.contribution || "",
      status: body.status || "Beklemede",
      contactEmail: body.contactEmail || "",
    },
  });
  return jsonOk(company, 201);
}
