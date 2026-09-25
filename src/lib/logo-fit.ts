import { SPONSOR_FIT } from "./sponsors";

export async function fitLogoFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/") && !/\.(png|jpe?g|webp|svg)$/i.test(file.name)) {
    throw new Error("PNG, JPG, WebP veya SVG yükleyin");
  }
  if (file.type.includes("svg") || /\.svg$/i.test(file.name)) return file;
  const bmp = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = SPONSOR_FIT.w;
  canvas.height = SPONSOR_FIT.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  const scale = Math.min(SPONSOR_FIT.w / bmp.width, SPONSOR_FIT.h / bmp.height);
  const w = Math.max(1, Math.round(bmp.width * scale));
  const h = Math.max(1, Math.round(bmp.height * scale));
  ctx.clearRect(0, 0, SPONSOR_FIT.w, SPONSOR_FIT.h);
  ctx.drawImage(bmp, (SPONSOR_FIT.w - w) / 2, (SPONSOR_FIT.h - h) / 2, w, h);
  bmp.close();
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Logo ölçeklenemedi"))), "image/png");
  });
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.png`, { type: "image/png" });
}
