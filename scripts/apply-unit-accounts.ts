import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { UNIT_ACCOUNTS } from "../src/lib/unit-accounts";

const prisma = new PrismaClient();

const PASSWORDS: Record<string, string> = {
  "tuseb@cop31.tr": "tuseb2026",
  "titck@cop31.tr": "titck2026",
  "ushas@cop31.tr": "ushas2026",
  "khgm@cop31.tr": "khgm2026",
  "shgm@cop31.tr": "shgm2026",
  "sggm@cop31.tr": "sggm2026",
  "sbsgm@cop31.tr": "sbsgm2026",
};

async function main() {
  for (const account of UNIT_ACCOUNTS) {
    const password = PASSWORDS[account.email];
    if (!password) {
      console.log(`SIFRE_YOK ${account.email}`);
      continue;
    }
    const data = {
      name: account.title,
      passwordHash: await bcrypt.hash(password, 10),
      role: "SAGLIK",
      title: account.unit,
      accountStatus: "Onaylandı",
    };
    const existing = await prisma.user.findUnique({ where: { email: account.email } });
    if (existing) {
      await prisma.user.update({ where: { id: existing.id }, data });
      console.log(`GUNCELLENDI ${account.email}`);
    } else {
      await prisma.user.create({ data: { email: account.email, ...data } });
      console.log(`ACILDI ${account.email}`);
    }
  }
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
