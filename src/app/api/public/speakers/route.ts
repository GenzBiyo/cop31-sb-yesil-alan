import { jsonOk } from "@/lib/api";
import { memoGet, memoSet } from "@/lib/memo";
import { prisma } from "@/lib/prisma";
import { ensureSpeakers, SPEAKER_APPROVED } from "@/lib/speakers";

const FRESH = { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" };

export async function GET() {
  const cached = memoGet("public-speakers", 20000);
  if (cached) return jsonOk(cached, 200, FRESH);
  await ensureSpeakers();
  const speakers = await prisma.speaker.findMany({
    where: { status: SPEAKER_APPROVED, active: true },
    select: { id: true, name: true, title: true, organization: true, summary: true, bio: true, linkedin: true, photoPath: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return jsonOk(memoSet("public-speakers", { speakers }), 200, FRESH);
}
