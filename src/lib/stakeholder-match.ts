import { prisma } from "./prisma";
import { toRow, type NamedPerson } from "./stakeholder-form";

export type FormHint = { companyName: string; days: string[]; headcount: number; speakers: NamedPerson[] };

const FOLD: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" };

function firstWord(name: string) {
  return (
    name
      .toLocaleLowerCase("tr")
      .replace(/[çğıöşüâîû]/g, (ch) => FOLD[ch] || ch)
      .split(/[^a-z0-9]+/)
      .find((w) => w.length >= 4) || ""
  );
}

/** The company's own stakeholder-form answer: by e-mail first, then by the first distinctive word of the name. */
export async function stakeholderFor(company: { name: string; contactEmail: string; users: { email: string }[] }): Promise<FormHint | null> {
  const emails = [company.contactEmail, ...company.users.map((u) => u.email)].map((e) => e.trim().toLocaleLowerCase("tr")).filter(Boolean);
  const rows = await prisma.stakeholderResponse.findMany({ orderBy: { submittedAt: "desc" } });
  const key = firstWord(company.name);
  const hit = rows.find((r) => emails.includes(r.email)) || (key ? rows.find((r) => firstWord(r.companyName) === key) : undefined);
  if (!hit) return null;
  const row = toRow(hit);
  return { companyName: row.companyName, days: row.days, headcount: row.headcount, speakers: row.speakers };
}
