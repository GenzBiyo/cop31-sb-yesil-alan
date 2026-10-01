import { jsonOk } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { ensureSpeakers, SPEAKER_APPROVED } from "@/lib/speakers";

export async function GET() {
  await ensureSpeakers();
  const speakers = await prisma.speaker.findMany({
    where: { status: SPEAKER_APPROVED, active: true },
    select: { id: true, name: true, title: true, organization: true, summary: true, bio: true, linkedin: true, photoPath: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return jsonOk({ speakers }, 200, { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" });
}
