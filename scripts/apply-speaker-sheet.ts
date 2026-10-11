import { readFileSync } from "fs";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type SheetSpeaker = { name: string; email: string; phone: string; title: string };
type SheetAccount = {
  login: string;
  password: string;
  organization: string;
  match: string[];
  speakers: SheetSpeaker[];
};

function fold(value: string) {
  return value
    .replace(/İ/g, "I")
    .replace(/ı/g, "i")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slugify(name: string) {
  const slug = fold(name).replace(/ /g, "-").replace(/^-|-$/g, "").slice(0, 40);
  return slug || "kurum";
}

function showName(name: string) {
  const trimmed = name.trim().replace(/\s+/g, " ");
  const letters = trimmed.replace(/[^A-Za-zÇĞİÖŞÜçğıöşü]/g, "");
  if (!letters || letters !== letters.toLocaleUpperCase("tr")) return trimmed;
  return trimmed
    .toLocaleLowerCase("tr")
    .split(" ")
    .map((part) => (part ? part.charAt(0).toLocaleUpperCase("tr") + part.slice(1) : part))
    .join(" ");
}

async function uniqueSlug(base: string) {
  let slug = base || "kurum";
  let n = 2;
  while (await prisma.company.findUnique({ where: { slug } })) {
    slug = `${base}-${n}`.slice(0, 48);
    n += 1;
  }
  return slug;
}

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("speaker sheet path required");
  const accounts = JSON.parse(readFileSync(file, "utf8")) as SheetAccount[];
  const companies = await prisma.company.findMany({
    include: { users: { where: { role: "FIRMA" }, orderBy: { createdAt: "asc" } } },
  });
  const speakers = await prisma.speaker.findMany();
  let added = 0;
  let updated = 0;

  for (const account of accounts) {
    const login = account.login.trim().toLowerCase();
    const password = account.password.trim();
    const needles = account.match.map(fold).filter(Boolean);
    let best: (typeof companies)[number] | null = null;
    let bestScore = 0;
    for (const company of companies) {
      const userEmail = company.users[0]?.email.toLowerCase() || "";
      const contact = company.contactEmail.toLowerCase();
      const name = fold(`${company.name} ${company.nameEn} ${company.slug}`);
      let score = 0;
      if (login && userEmail === login) score = 100;
      else if (login && contact === login) score = 90;
      else if (login && company.slug === login.split("@")[0]) score = 80;
      else if (needles.some((needle) => name.includes(needle))) score = 50 + Math.max(...needles.filter((needle) => name.includes(needle)).map((needle) => needle.length));
      if (score > bestScore) {
        best = company;
        bestScore = score;
      }
    }

    const company =
      best ||
      (await prisma.company.create({
        data: {
          slug: await uniqueSlug(slugify(login.split("@")[0] || account.organization)),
          name: account.organization,
          status: "Onaylandı",
          contactEmail: login,
          kind: "firma",
        },
        include: { users: true },
      }));
    if (!best) companies.push(company);

    if (login) {
      const taken = await prisma.user.findUnique({ where: { email: login } });
      const existing = company.users[0];
      let linked = false;
      if (taken && taken.id !== existing?.id) {
        console.log(`SKIP_EMAIL ${login}`);
      } else if (existing) {
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            email: login,
            accountStatus: "Onaylandı",
            ...(password.length >= 8 ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
          },
        });
        linked = true;
      } else if (password.length >= 8) {
        const created = await prisma.user.create({
          data: {
            email: login,
            name: account.speakers[0]?.name || account.organization,
            passwordHash: await bcrypt.hash(password, 10),
            role: "FIRMA",
            title: "Kurum yetkilisi",
            accountStatus: "Onaylandı",
            companyId: company.id,
          },
        });
        company.users.push(created);
        linked = true;
      } else {
        console.log(`SKIP_PASSWORD ${login || account.organization}`);
      }
      if (linked) {
        await prisma.company.update({ where: { id: company.id }, data: { contactEmail: login, status: "Onaylandı" } });
        company.contactEmail = login;
      }
    }

    const delegation = parseDelegation(company.delegation);
    for (const speaker of account.speakers) {
      const name = showName(speaker.name);
      if (!name) continue;
      const key = fold(name);
      const current = delegation.find((row) => fold(row.name) === key);
      if (current) {
        if (speaker.email) current.email = speaker.email.toLowerCase();
        if (speaker.phone) current.phone = speaker.phone;
        if (speaker.title && !current.title) current.title = speaker.title;
        if (!current.duty) current.duty = "Konuşmacı";
      } else {
        delegation.push({
          name,
          title: speaker.title,
          duty: "Konuşmacı",
          email: speaker.email.toLowerCase(),
          phone: speaker.phone,
        });
      }

      const known = speakers.find((row) => fold(row.name) === key);
      if (known) {
        await prisma.speaker.update({
          where: { id: known.id },
          data: {
            organization: account.organization,
            companyId: company.id,
            status: "Onaylandı",
            active: true,
            ...(speaker.title ? { title: speaker.title } : {}),
          },
        });
        updated += 1;
      } else {
        const last = await prisma.speaker.aggregate({ _max: { sortOrder: true } });
        const created = await prisma.speaker.create({
          data: {
            name,
            title: speaker.title,
            organization: account.organization,
            companyId: company.id,
            status: "Onaylandı",
            active: true,
            sortOrder: (last._max.sortOrder || 0) + 1,
          },
        });
        speakers.push(created);
        added += 1;
      }
    }

    await prisma.company.update({
      where: { id: company.id },
      data: {
        delegation: JSON.stringify(delegation.slice(0, 40)),
        status: "Onaylandı",
      },
    });
    console.log(`ACCOUNT ${login || account.organization} password=${password.length >= 8 ? "yes" : "no"} speakers=${account.speakers.length}`);
  }

  console.log(`SHEET_APPLIED added=${added} updated=${updated}`);
}

function parseDelegation(text: string) {
  try {
    const rows = JSON.parse(text || "[]") as { name?: string; title?: string; duty?: string; email?: string; phone?: string }[];
    if (!Array.isArray(rows)) return [];
    return rows.map((row) => ({
      name: String(row.name || "").trim(),
      title: String(row.title || "").trim(),
      duty: String(row.duty || "").trim(),
      email: String(row.email || "").trim(),
      phone: String(row.phone || "").trim(),
    })).filter((row) => row.name);
  } catch {
    return [];
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
