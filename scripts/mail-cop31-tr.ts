import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const FROM = "@firma.cop31.tr";
const TO = "@cop31.tr";

function swap(value: string) {
  return value.split(FROM).join(TO);
}

function spare(email: string, id: string) {
  const at = email.lastIndexOf("@");
  const local = at > 0 ? email.slice(0, at) : "kayit";
  return `${local}-${id.slice(-6)}@cop31.tr`;
}

async function rewrite(
  label: string,
  load: () => Promise<{ id: string; email: string }[]>,
  save: (id: string, email: string) => Promise<unknown>,
  blocked: (id: string, email: string) => Promise<boolean>,
) {
  const rows = await load();
  let changed = 0;
  for (const row of rows) {
    let email = swap(row.email);
    if (!email || email === row.email) continue;
    if (await blocked(row.id, email)) email = spare(email, row.id);
    if (await blocked(row.id, email)) {
      console.log(`SKIP ${label} ${row.email}`);
      continue;
    }
    await save(row.id, email);
    changed += 1;
  }
  console.log(`${label} changed=${changed}`);
}

async function main() {
  await rewrite(
    "user",
    () => prisma.user.findMany({ where: { email: { contains: FROM } }, select: { id: true, email: true } }),
    (id, email) => prisma.user.update({ where: { id }, data: { email } }),
    async (id, email) => Boolean(await prisma.user.findFirst({ where: { email, NOT: { id } }, select: { id: true } })),
  );
  await rewrite(
    "company",
    () =>
      prisma.company
        .findMany({ where: { contactEmail: { contains: FROM } }, select: { id: true, contactEmail: true } })
        .then((rows) => rows.map((row) => ({ id: row.id, email: row.contactEmail }))),
    (id, email) => prisma.company.update({ where: { id }, data: { contactEmail: email } }),
    async () => false,
  );
  await rewrite(
    "person",
    () => prisma.person.findMany({ where: { email: { contains: FROM } }, select: { id: true, email: true } }),
    (id, email) => prisma.person.update({ where: { id }, data: { email } }),
    async () => false,
  );
  await rewrite(
    "signup",
    () => prisma.agendaSignup.findMany({ where: { email: { contains: FROM } }, select: { id: true, email: true, agendaId: true } }),
    (id, email) => prisma.agendaSignup.update({ where: { id }, data: { email } }),
    async (id, email) => {
      const row = await prisma.agendaSignup.findUnique({ where: { id }, select: { agendaId: true } });
      if (!row) return true;
      return Boolean(await prisma.agendaSignup.findFirst({ where: { agendaId: row.agendaId, email, NOT: { id } }, select: { id: true } }));
    },
  );
  await rewrite(
    "notice",
    () => prisma.agendaNotice.findMany({ where: { email: { contains: FROM } }, select: { id: true, email: true } }),
    (id, email) => prisma.agendaNotice.update({ where: { id }, data: { email } }),
    async () => false,
  );
  await rewrite(
    "ambassador",
    () => prisma.ambassadorApplication.findMany({ where: { email: { contains: FROM } }, select: { id: true, email: true } }),
    (id, email) => prisma.ambassadorApplication.update({ where: { id }, data: { email } }),
    async () => false,
  );
  await rewrite(
    "visitor",
    () => prisma.visitor.findMany({ where: { email: { contains: FROM } }, select: { id: true, email: true } }),
    (id, email) => prisma.visitor.update({ where: { id }, data: { email } }),
    async () => false,
  );
  await rewrite(
    "device",
    () => prisma.appDevice.findMany({ where: { email: { contains: FROM } }, select: { id: true, email: true } }),
    (id, email) => prisma.appDevice.update({ where: { id }, data: { email } }),
    async () => false,
  );
  await rewrite(
    "stakeholder",
    () => prisma.stakeholderResponse.findMany({ where: { email: { contains: FROM } }, select: { id: true, email: true } }),
    (id, email) => prisma.stakeholderResponse.update({ where: { id }, data: { email } }),
    async (id, email) => Boolean(await prisma.stakeholderResponse.findFirst({ where: { email, NOT: { id } }, select: { id: true } })),
  );
  await rewrite(
    "booking",
    () => prisma.ministrySlot.findMany({ where: { bookingEmail: { contains: FROM } }, select: { id: true, bookingEmail: true } }).then((rows) => rows.map((row) => ({ id: row.id, email: row.bookingEmail }))),
    (id, email) => prisma.ministrySlot.update({ where: { id }, data: { bookingEmail: email } }),
    async () => false,
  );
  console.log("MAIL_COP31_TR");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
