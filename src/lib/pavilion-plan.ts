import fs from "fs";
import path from "path";

export const DEFAULT_PAVILION_PLAN = "/brand/sb-pavilyon.png";

const NAMES = ["plan.png", "plan.jpg", "plan.jpeg", "plan.webp"];

export function pavilionPlanDir() {
  return path.join(process.cwd(), "public", "uploads", "pavilion");
}

export function pavilionPlanFile() {
  const found = NAMES.map((name) => path.join(pavilionPlanDir(), name))
    .filter((file) => fs.existsSync(file))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return found[0] || path.join(process.cwd(), "public", "brand", "sb-pavilyon.png");
}

export function pavilionPlanSrc() {
  const file = pavilionPlanFile();
  const uploaded = file.includes(`${path.sep}uploads${path.sep}`);
  const src = uploaded ? `/uploads/pavilion/${path.basename(file)}` : DEFAULT_PAVILION_PLAN;
  try {
    return `${src}?v=${Math.floor(fs.statSync(file).mtimeMs)}`;
  } catch {
    return src;
  }
}
