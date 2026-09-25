import { prisma } from "@/lib/prisma";
import { jsonOk } from "@/lib/api";
import { DEFAULT_MAIN_LOGO, MAIN_LOGO_KEY, resolveMainLogo } from "@/lib/sponsors";

export async function GET() {
  const [setting, rows] = await Promise.all([
    prisma.setting.findUnique({ where: { key: MAIN_LOGO_KEY } }),
    prisma.sponsor.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true, logoPath: true, url: true, sortOrder: true },
    }),
  ]);
  return jsonOk({
    mainLogo: resolveMainLogo(setting?.value) || DEFAULT_MAIN_LOGO,
    sponsors: rows,
  });
}
