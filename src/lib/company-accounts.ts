import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { DEMO_PASSWORD } from "./constants";

function emailFor(slug: string, contactEmail: string) {
  const contact = contactEmail.trim().toLowerCase();
  if (contact.includes("@")) return contact;
  return `${slug}@firma.cop31.tr`;
}

export async function ensureCompanyAccounts() {
  const companies = await prisma.company.findMany({
    include: { users: { select: { id: true, role: true } } },
    orderBy: { name: "asc" },
  });
  const missing = companies.filter((company) => !company.users.some((user) => user.role === "FIRMA"));
  if (!missing.length) return;
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  for (const company of missing) {
    let email = emailFor(company.slug, company.contactEmail);
    const taken = await prisma.user.findUnique({ where: { email } });
    if (taken && taken.companyId !== company.id) {
      email = `${company.slug}@firma.cop31.tr`;
      const again = await prisma.user.findUnique({ where: { email } });
      if (again) continue;
    } else if (taken) {
      continue;
    }
    await prisma.user.create({
      data: {
        email,
        name: `${company.name} yetkilisi`,
        passwordHash,
        role: "FIRMA",
        title: "Firma yetkilisi",
        accountStatus: "Onaylandı",
        companyId: company.id,
      },
    });
    if (!company.contactEmail) {
      await prisma.company.update({ where: { id: company.id }, data: { contactEmail: email } });
    }
  }
}
