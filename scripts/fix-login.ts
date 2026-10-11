import { readFileSync } from "fs";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Fix = { oxoidPassword: string; siemensEmail: string };

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("fix file required");
  const fix = JSON.parse(readFileSync(file, "utf8")) as Fix;
  const password = String(fix.oxoidPassword || "").trim();
  const siemensEmail = String(fix.siemensEmail || "").trim().toLowerCase();
  if (password.length < 8) throw new Error("oxoid password missing");
  if (!siemensEmail.includes("@")) throw new Error("siemens email missing");

  const oxoid = await prisma.user.findUnique({ where: { email: "oxoid@cop31.tr" } });
  if (!oxoid) throw new Error("oxoid account missing");
  await prisma.user.update({
    where: { id: oxoid.id },
    data: { passwordHash: await bcrypt.hash(password, 10), accountStatus: "Onaylandı" },
  });
  console.log("OXOID_PASSWORD_SET");

  const wanted = await prisma.user.findUnique({ where: { email: siemensEmail } });
  if (wanted) {
    if (wanted.companyId) {
      await prisma.company.update({ where: { id: wanted.companyId }, data: { contactEmail: siemensEmail } });
    }
    console.log(`SIEMENS_EMAIL ${siemensEmail}`);
  } else {
    const previous = await prisma.user.findUnique({ where: { email: "siemens@cop31.tr" } });
    if (!previous) throw new Error("siemens account missing");
    await prisma.user.update({
      where: { id: previous.id },
      data: { email: siemensEmail, accountStatus: "Onaylandı" },
    });
    if (previous.companyId) {
      await prisma.company.update({ where: { id: previous.companyId }, data: { contactEmail: siemensEmail } });
    }
    console.log(`SIEMENS_EMAIL ${siemensEmail}`);
  }
  console.log("LOGIN_FIX_OK");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
