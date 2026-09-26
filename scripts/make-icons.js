const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const dir = path.join(__dirname, "..", "public", "icons");
fs.mkdirSync(dir, { recursive: true });

function svg(size) {
  const bar = Math.round(size * 0.045);
  const r = Math.round(size * 0.16);
  const stroke = Math.max(8, Math.round(size * 0.035));
  const font = Math.round(size * 0.16);
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <rect width="${size}" height="${size}" rx="${Math.round(size * 0.18)}" fill="#0077C2"/>
      <rect width="${size}" height="${bar}" fill="#E31C23"/>
      <circle cx="${size / 2}" cy="${size * 0.42}" r="${r}" fill="none" stroke="#32C45A" stroke-width="${stroke}"/>
      <text x="50%" y="78%" text-anchor="middle" font-family="Georgia, serif" font-size="${font}" fill="white">COP31</text>
    </svg>`
  );
}

async function main() {
  await sharp(svg(192)).png().toFile(path.join(dir, "icon-192.png"));
  await sharp(svg(512)).png().toFile(path.join(dir, "icon-512.png"));
  await sharp(svg(180)).png().toFile(path.join(dir, "apple-touch-icon.png"));
  console.log("icons ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
