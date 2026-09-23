import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/auth";
import { jsonError, jsonOk, withUser } from "@/lib/api";
import { ensureAmbassadorForm } from "@/lib/ambassador-db";

export async function GET() {
  const form = await ensureAmbassadorForm();
  const { user } = await withUser();
  if (!user) {
    return jsonOk({
      intro: form.intro,
      fields: form.fields.filter((f) => f.enabled),
    });
  }
  return jsonOk(form);
}

export async function PUT(req: NextRequest) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const body = await req.json();
  if (typeof body.intro === "string") {
    await prisma.setting.upsert({
      where: { key: "ambassadorIntro" },
      update: { value: body.intro },
      create: { key: "ambassadorIntro", value: body.intro },
    });
  }
  if (Array.isArray(body.fields)) {
    for (const field of body.fields) {
      if (field._delete && field.id) {
        await prisma.formField.delete({ where: { id: field.id } }).catch(() => null);
        continue;
      }
      const data = {
        key: String(field.key || "").trim() || `alan_${Date.now()}`,
        label: field.label || "Alan",
        type: field.type || "text",
        required: Boolean(field.required),
        options: field.options || "",
        help: field.help || "",
        sortOrder: Number(field.sortOrder || 0),
        enabled: field.enabled !== false,
        formKey: "ambassador",
      };
      if (field.id && !String(field.id).startsWith("new-")) {
        await prisma.formField.update({ where: { id: field.id }, data });
      } else {
        await prisma.formField.create({ data });
      }
    }
  }
  return jsonOk(await ensureAmbassadorForm());
}
