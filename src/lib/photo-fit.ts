export const SPEAKER_PHOTO_SIZE = 600;

/** Centre-crops any photo to a square and scales it to a fixed size so every speaker card matches. */
export async function fitSpeakerPhoto(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) throw new Error("JPG, PNG veya WebP fotoğraf yükleyin");
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  const sx = (bmp.width - side) / 2;
  const sy = Math.max(0, (bmp.height - side) / 2 - (bmp.height - side) * 0.15);
  const canvas = document.createElement("canvas");
  canvas.width = SPEAKER_PHOTO_SIZE;
  canvas.height = SPEAKER_PHOTO_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bmp, sx, sy, side, side, 0, 0, SPEAKER_PHOTO_SIZE, SPEAKER_PHOTO_SIZE);
  bmp.close();
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Fotoğraf işlenemedi"))), "image/jpeg", 0.88);
  });
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "konusmaci"}.jpg`, { type: "image/jpeg" });
}
