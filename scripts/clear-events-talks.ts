import { prisma } from "../src/lib/prisma";
import { clearEventsAndTalks } from "../src/lib/events-db";

clearEventsAndTalks()
  .then(async () => {
    const [events, talks] = await Promise.all([
      prisma.pavilionEvent.count(),
      prisma.panel.count({ where: { kind: "sunum" } }),
    ]);
    console.log(`EVENTS_TALKS_CLEARED events=${events} talks=${talks}`);
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
