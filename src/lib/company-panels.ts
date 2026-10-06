import type { Prisma } from "@prisma/client";

type CompanyRef = { id: string; slug: string; name: string };

/** Panels and talks the company proposed, is listed as a partner on, or has people in. */
export function companyPanelWhere(company: CompanyRef): Prisma.PanelWhereInput {
  return {
    OR: [
      { companyId: company.id },
      { partners: { contains: company.name } },
      { participants: { some: { companyId: company.id } } },
      { participants: { some: { person: { companySlug: company.slug } } } },
      { participants: { some: { person: { organization: company.name } } } },
    ],
  };
}

/** Whether a lineup row is one of the company's own speakers. */
export function isOwnParticipant(
  row: { companyId: string; person: { companySlug: string; organization: string } },
  company: CompanyRef
) {
  return row.companyId === company.id || row.person.companySlug === company.slug || row.person.organization === company.name;
}
