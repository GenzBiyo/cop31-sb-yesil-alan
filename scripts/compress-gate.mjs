import sharp from "sharp";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const dir = path.join(process.cwd(), "public", "gate");
const files = (await readdir(dir)).filter((f) => f.endsWith(".png"));
for (const file of files) {
  const src = path.join(dir, file);
  const dest = src.replace(/\.png$/i, ".webp");
  const before = (await stat(src)).size;
  await sharp(src).resize({ width: 1400, withoutEnlargement: true }).webp({ quality: 68 }).toFile(dest);
  const after = (await stat(dest)).size;
  console.log(`${file} ${(before / 1024).toFixed(0)}KB -> ${path.basename(dest)} ${(after / 1024).toFixed(0)}KB`);
}
