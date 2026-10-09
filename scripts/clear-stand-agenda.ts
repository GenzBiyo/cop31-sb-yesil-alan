import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const KEEP = /panel|sunum|seminer|quick talk|konuşma|etkinlik|deneyim|oyun/i;

async function main() {
  const rows = await prisma.agendaItem.findMany({ select: { id: true, type: true, title: true } });
  const ids = rows.filter((row) => !KEEP.test(row.type)).map((row) => row.id);
  if (ids.length) {
    await prisma.agendaSignup.deleteMany({ where: { agendaId: { in: ids } } });
    await prisma.agendaNotice.deleteMany({ where: { agendaId: { in: ids } } });
    await prisma.agendaItem.deleteMany({ where: { id: { in: ids } } });
  }
  console.log(`SESSION_CALENDAR_ONLY removed=${ids.length}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
