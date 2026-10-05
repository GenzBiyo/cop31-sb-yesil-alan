import { prisma } from "@/lib/prisma";
import { jsonOk } from "@/lib/api";
import { memoGet, memoSet } from "@/lib/memo";
import { DEFAULT_MAIN_LOGO, MAIN_LOGO_KEY, resolveMainLogo } from "@/lib/sponsors";

const FRESH = { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" };

export async function GET() {
  const cached = memoGet("public-sponsors", 20000);
  if (cached) return jsonOk(cached, 200, FRESH);
  const [setting, rows] = await Promise.all([
    prisma.setting.findUnique({ where: { key: MAIN_LOGO_KEY } }),
    prisma.sponsor.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true, logoPath: true, url: true, sortOrder: true },
    }),
  ]);
  const body = {
    mainLogo: resolveMainLogo(setting?.value) || DEFAULT_MAIN_LOGO,
    sponsors: rows,
  };
  return jsonOk(memoSet("public-sponsors", body), 200, FRESH);
}
