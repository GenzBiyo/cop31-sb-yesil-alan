import { HATIRA_MODEL, HATIRA_WASM } from "./hatira";

export async function cutoutPerson(img: HTMLImageElement, slug?: string): Promise<HTMLCanvasElement> {
  if (slug) {
    try {
      const blob = await cutoutOnServer(img, slug);
      const cut = await blobToImage(blob);
      return tightenAlpha(imageToCanvas(cut));
    } catch {
      // fall through to local segmenter
    }
  }
  return cutoutLocal(img);
}

export function warmupSegmenter() {
  void loadSegmenter();
}

async function cutoutOnServer(img: HTMLImageElement, slug: string) {
  const jpeg = imageToJpeg(img, 1280);
  const form = new FormData();
  form.append("photo", jpeg, "selfie.jpg");
  const res = await fetch(`/api/public/games/${slug}/hatira/cutout`, { method: "POST", body: form });
  if (!res.ok) throw new Error("sunucu kesemedi");
  return await res.blob();
}

function imageToJpeg(img: HTMLImageElement, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(img.width * scale));
  c.height = Math.max(1, Math.round(img.height * scale));
  c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
  const data = c.toDataURL("image/jpeg", 0.9);
  const bin = atob(data.split(",")[1] || "");
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: "image/jpeg" });
}

function imageToCanvas(img: HTMLImageElement) {
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  c.getContext("2d")?.drawImage(img, 0, 0);
  return c;
}

function blobToImage(blob: Blob) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve(img);
    };
    img.onerror = () => reject(new Error("kesim yüklenemedi"));
    img.src = URL.createObjectURL(blob);
  });
}

function tightenAlpha(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    const a = px[i + 3];
    if (a < 72) px[i + 3] = 0;
    else if (a < 170) px[i + 3] = Math.round((a - 72) * (255 / 98));
  }
  ctx.putImageData(data, 0, 0);
  return canvas;
}

type Segmenter = {
  segment: (image: HTMLImageElement) => {
    categoryMask?: { width: number; height: number; getAsUint8Array: () => Uint8Array; getAsFloat32Array?: () => Float32Array };
    confidenceMasks?: { width: number; height: number; getAsFloat32Array: () => Float32Array }[];
    close?: () => void;
  };
};

let segmenterPromise: Promise<Segmenter | null> | null = null;

async function loadSegmenter(): Promise<Segmenter | null> {
  if (segmenterPromise) return segmenterPromise;
  segmenterPromise = (async () => {
    try {
      const mp = await import("@mediapipe/tasks-vision");
      const vision = await mp.FilesetResolver.forVisionTasks(HATIRA_WASM);
      return await mp.ImageSegmenter.createFromOptions(vision, {
        baseOptions: { modelAssetPath: HATIRA_MODEL, delegate: "CPU" },
        runningMode: "IMAGE",
        outputCategoryMask: true,
        outputConfidenceMasks: true,
      });
    } catch {
      segmenterPromise = null;
      return null;
    }
  })();
  return segmenterPromise;
}

async function cutoutLocal(img: HTMLImageElement): Promise<HTMLCanvasElement> {
  const out = imageToCanvas(img);
  const ctx = out.getContext("2d");
  if (!ctx) return out;
  const segmenter = await loadSegmenter();
  if (!segmenter) return out;
  let result: ReturnType<Segmenter["segment"]> | null = null;
  try {
    result = segmenter.segment(img);
    const conf = result.confidenceMasks?.[0];
    const cat = result.categoryMask;
    const src = conf ? conf.getAsFloat32Array() : cat?.getAsUint8Array();
    const sw = conf?.width || cat?.width || 0;
    const sh = conf?.height || cat?.height || 0;
    if (!src || !sw || !sh) return out;
    const w = out.width;
    const h = out.height;
    const mask = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      const sy = Math.min(sh - 1, Math.floor((y * sh) / h));
      for (let x = 0; x < w; x++) {
        const sx = Math.min(sw - 1, Math.floor((x * sw) / w));
        const v = Number(src[sy * sw + sx]);
        const a = conf ? Math.round(Math.max(0, Math.min(1, v)) * 255) : v > 0 ? 255 : 0;
        const i = (y * w + x) * 4;
        mask.data[i] = 255;
        mask.data[i + 1] = 255;
        mask.data[i + 2] = 255;
        mask.data[i + 3] = a < 140 ? 0 : 255;
      }
    }
    const mc = document.createElement("canvas");
    mc.width = w;
    mc.height = h;
    mc.getContext("2d")?.putImageData(mask, 0, 0);
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(mc, 0, 0);
    ctx.globalCompositeOperation = "source-over";
  } catch {
    ctx.clearRect(0, 0, out.width, out.height);
    ctx.drawImage(img, 0, 0);
  } finally {
    result?.close?.();
  }
  return tightenAlpha(out);
}
