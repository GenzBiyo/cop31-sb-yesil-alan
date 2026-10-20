import { writeFile } from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.speaker.findMany({
    select: { name: true, title: true, organization: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const body =
    "export const SPEAKER_CATALOG: { name: string; title: string; organization: string }[] = " +
    JSON.stringify(rows, null, 2) +
    ";\n";
  await writeFile(path.join(process.cwd(), "src", "lib", "speaker-catalog.ts"), body, "utf8");
  console.log(`catalog ${rows.length}`);
}

main().finally(() => prisma.$disconnect());
