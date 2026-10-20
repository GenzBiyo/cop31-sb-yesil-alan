import { NextRequest } from "next/server";
import { jsonOk } from "@/lib/api";
import { memoGet, memoSet } from "@/lib/memo";
import { prisma } from "@/lib/prisma";
import { ensureSpeakers, SPEAKER_APPROVED } from "@/lib/speakers";

const FRESH = { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" };

const briefSelect = { id: true, name: true, title: true, organization: true, photoPath: true };
const fullSelect = { ...briefSelect, summary: true, bio: true, linkedin: true };

export async function GET(req: NextRequest) {
  const brief = new URL(req.url).searchParams.get("brief") === "1";
  const key = brief ? "public-speakers-brief" : "public-speakers";
  const cached = memoGet(key, 20000);
  if (cached) return jsonOk(cached, 200, FRESH);
  await ensureSpeakers();
  const speakers = await prisma.speaker.findMany({
    where: { status: SPEAKER_APPROVED, active: true },
    select: brief ? briefSelect : fullSelect,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    ...(brief ? { take: 16 } : {}),
  });
  return jsonOk(memoSet(key, { speakers }), 200, FRESH);
}
