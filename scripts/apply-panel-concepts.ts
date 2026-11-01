import { readFileSync } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const dry = process.argv.includes("--dry");

type Note = { no: string; title: string; note: string };

function fold(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOP = new Set(["ve", "ile", "icin", "bir", "the", "of", "and", "for"]);

function tokens(value: string) {
  return fold(value).split(" ").filter((word) => word.length > 2 && !STOP.has(word));
}

function score(a: string, b: string) {
  const left = fold(a);
  const right = fold(b);
  if (left === right) return 100;
  if (left.includes(right) || right.includes(left)) return 92;
  const aTokens = tokens(a);
  const bTokens = new Set(tokens(b));
  if (!aTokens.length || !bTokens.size) return 0;
  const shared = aTokens.filter((word) => bTokens.has(word)).length;
  const union = new Set([...aTokens, ...bTokens]).size;
  return Math.round((100 * shared) / union);
}

async function main() {
  const file = path.join(process.cwd(), "data", "panel-concept-notes.json");
  const notes = JSON.parse(readFileSync(file, "utf8")) as Note[];
  const panels = await prisma.panel.findMany({ select: { id: true, title: true } });
  const used = new Set<string>();
  let written = 0;

  for (const note of notes) {
    const ranked = panels
      .map((panel) => ({ panel, score: score(note.title, panel.title) }))
      .sort((a, b) => b.score - a.score);
    const best = ranked[0];
    const second = ranked[1];
    const close = second && best.score < 100 && best.score - second.score < 8;
    if (!best || best.score < 58 || close) {
      console.log(`ESLESMEDI ${note.no} (${best ? best.score : 0}) ${best?.panel.title || ""}`);
      continue;
    }
    if (used.has(best.panel.id)) {
      console.log(`CIFT ${note.no} ${best.panel.title}`);
      continue;
    }
    used.add(best.panel.id);
    if (!dry) {
      await prisma.panel.update({ where: { id: best.panel.id }, data: { summary: note.note } });
      await prisma.agendaItem.updateMany({ where: { panelId: best.panel.id }, data: { description: note.note } });
    }
    written += 1;
    console.log(`YAZILDI ${note.no} ${best.score} ${best.panel.title}`);
  }

  console.log(dry ? `DENEME ${written}` : `GUNCELLENDI ${written}`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
