const path = require("path");
const sharp = require("sharp");

const src = path.join(__dirname, "..", "public", "icons", "saglik-symbol.png");
const dir = path.join(__dirname, "..", "public", "icons");

function tile(size, pad) {
  const inner = Math.round(size * (1 - pad * 2));
  return sharp(src)
    .resize(inner, inner, { fit: "inside" })
    .extend({
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .resize(size, size, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png();
}

async function main() {
  await tile(48, 0.12).toFile(path.join(dir, "saglik-48.png"));
  await tile(192, 0.12).toFile(path.join(dir, "saglik-192.png"));
  await tile(192, 0.12).toFile(path.join(dir, "icon-192.png"));
  await tile(512, 0.12).toFile(path.join(dir, "saglik-512.png"));
  await tile(512, 0.12).toFile(path.join(dir, "icon-512.png"));
  await tile(180, 0.14).toFile(path.join(dir, "saglik-apple.png"));
  await tile(180, 0.14).toFile(path.join(dir, "apple-touch-icon.png"));
  await tile(512, 0.24).toFile(path.join(dir, "saglik-maskable.png"));
  console.log("icons ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
