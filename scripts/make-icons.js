const path = require("path");
const sharp = require("sharp");

const src = path.join(__dirname, "..", "public", "hatira", "logo-saglik.jpg");
const dir = path.join(__dirname, "..", "public", "icons");

function seal(size) {
  return sharp(src).extract({ left: 72, top: 72, width: 880, height: 880 }).resize(size, size).png();
}

async function main() {
  await seal(48).toFile(path.join(dir, "saglik-48.png"));
  await seal(192).toFile(path.join(dir, "saglik-192.png"));
  await seal(192).toFile(path.join(dir, "icon-192.png"));
  await seal(512).toFile(path.join(dir, "saglik-512.png"));
  await seal(512).toFile(path.join(dir, "icon-512.png"));
  await seal(180).toFile(path.join(dir, "saglik-apple.png"));
  await seal(180).toFile(path.join(dir, "apple-touch-icon.png"));
  console.log("icons ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
