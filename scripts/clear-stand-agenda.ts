import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const gone = await prisma.agendaItem.deleteMany({ where: { type: "Stant" } });
  console.log(`STANDS_OFF_AGENDA count=${gone.count}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
