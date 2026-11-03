import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { AMBASSADOR_PASSWORD } from "../src/lib/ambassador-access";
import { isAmbassadorAccepted } from "../src/lib/ambassador-card";

const prisma = new PrismaClient();

const LOOKUP = [
  { label: "Dina Wahid", name: "dina wahid", school: "beyazit", skip: [] as string[] },
  { label: "Jana Abdullaeva", name: "jana abdullaeva", school: "antalya bilim", skip: [] as string[] },
  { label: "Selma Kır", name: "selma", school: "ankara", skip: ["yildirim", "bilim"] },
  { label: "Yasir Tahiroğlu", name: "yasir", school: "medeniyet", skip: [] as string[] },
  { label: "Zülal Gündüz", name: "zulal", school: "medipol", skip: [] as string[] },
];

function fold(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ı/g, "i");
}

async function main() {
  const passwordHash = await bcrypt.hash(AMBASSADOR_PASSWORD, 10);
  const accepted = await prisma.ambassadorApplication.findMany({
    where: { status: { in: ["Kabul edildi", "Yerleştirildi"] } },
    orderBy: { updatedAt: "desc" },
  });
  const seen = new Set<string>();
  for (const person of accepted) {
    const email = person.email.trim().toLowerCase();
    if (!email.includes("@") || seen.has(email)) continue;
    seen.add(email);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.role !== "ELCI") {
      console.log(`ATLANDI ${email} ${existing.role}`);
      continue;
    }
    const data = {
      name: person.fullName,
      passwordHash,
      role: "ELCI",
      title: person.school,
      accountStatus: "Onaylandı",
    };
    if (existing) {
      await prisma.user.update({ where: { id: existing.id }, data });
      console.log(`GUNCELLENDI ${email}`);
    } else {
      await prisma.user.create({ data: { email, ...data } });
      console.log(`ACILDI ${email}`);
    }
  }

  const apps = await prisma.ambassadorApplication.findMany({
    select: { fullName: true, email: true, school: true, status: true },
  });
  for (const wanted of LOOKUP) {
    const hits = apps.filter((row) => {
      const name = fold(row.fullName);
      const school = fold(row.school);
      if (!name.includes(wanted.name) || !school.includes(wanted.school)) return false;
      return !wanted.skip.some((part) => school.includes(part));
    });
    if (!hits.length) {
      console.log(`ELCI_KONTROL ${wanted.label} | BULUNAMADI`);
      continue;
    }
    for (const hit of hits) {
      const login = isAmbassadorAccepted(hit.status) ? "GIRIS_OLUR" : "GIRIS_OLMAZ";
      console.log(`ELCI_KONTROL ${wanted.label} | ${hit.email} | ${hit.school} | ${hit.status} | ${login}`);
    }
  }
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
