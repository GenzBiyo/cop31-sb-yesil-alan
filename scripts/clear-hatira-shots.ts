import { readdir, unlink } from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const players = await prisma.gamePlayer.findMany({
    where: { photoPath: { not: "" }, game: { type: "hatira" } },
    select: { id: true },
  });
  const ids = players.map((row) => row.id);
  if (ids.length) {
    await prisma.gameAnswer.deleteMany({ where: { playerId: { in: ids } } });
    await prisma.gamePlayer.deleteMany({ where: { id: { in: ids } } });
  }
  const dir = path.join(process.cwd(), "public", "uploads", "hatira");
  let files = 0;
  try {
    for (const name of await readdir(dir)) {
      if (!/\.(jpe?g|png|webp)$/i.test(name)) continue;
      await unlink(path.join(dir, name));
      files += 1;
    }
  } catch {
    files = 0;
  }
  console.log(`HATIRA_CLEARED players=${ids.length} files=${files}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
