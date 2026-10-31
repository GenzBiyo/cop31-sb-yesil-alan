"use client";

import { useEffect, useState } from "react";
import { CARD_TAGS, cardFileName, cardShareCaption } from "@/lib/ambassador-card";

const TEMPLATE = "/brand/elci-kart.jpg";
const INK = "#FFFFFF";
const NAME_FIELD = { x: 566, y: 770, w: 860, size: 54 };
const SCHOOL_FIELD = { x: 566, y: 870, w: 780, size: 28 };

export function AcceptanceCard({ name, school, city }: { name: string; school: string; city: string }) {
  const [jpeg, setJpeg] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const caption = cardShareCaption(name);
  const pageUrl = typeof window !== "undefined" ? window.location.href : "";

  useEffect(() => {
    let cancel = false;
    void paintCard({ name, school, city })
      .then((url) => {
        if (!cancel) setJpeg(url);
      })
      .catch(() => {
        if (!cancel) setError("Kart hazırlanamadı. Sayfayı yenileyin.");
      });
    return () => {
      cancel = true;
    };
  }, [name, school, city]);

  async function download() {
    if (!jpeg) return;
    setNote("");
    const blob = await (await fetch(jpeg)).blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = cardFileName(name);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  async function shareNative() {
    if (!jpeg) return;
    setNote("");
    const blob = await (await fetch(jpeg)).blob();
    const file = new File([blob], cardFileName(name), { type: "image/jpeg" });
    const payload: ShareData = { title: "İklim Sağlık Elçisi", text: `${caption}\n${pageUrl}`, files: [file] };
    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      try {
        await navigator.share(payload);
        return;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }
    await download();
    setNote("Bu tarayıcı görseli doğrudan paylaşamıyor. JPG indirildi; galeriden Instagram, WhatsApp veya LinkedIn’e ekleyin.");
  }

  function openShare(href: string) {
    window.open(href, "_blank", "noopener,width=560,height=640");
  }

  const shareText = `${caption}\n${pageUrl}`;

  return (
    <main className="min-h-screen bg-[#EEF8FD] text-[#0B1C33] px-4 py-8">
      <div className="mx-auto max-w-[440px] space-y-4">
        <div className="text-center">
          <p className="text-xs font-bold tracking-[0.22em] text-[#0077C2]">COP31 TÜRKİYE · ANTALYA</p>
          <h1 className="display text-4xl mt-1">Tebrikler</h1>
          <p className="text-sm text-[#3E6A88] mt-1">İsminiz ve okulunuz kartın üzerine yazılır. JPG indirip paylaşabilirsiniz.</p>
        </div>
        {error ? <p className="text-sm text-[#E31C23] text-center">{error}</p> : null}
        {jpeg ? (
          <img src={jpeg} alt={`${name} İklim Sağlık Elçisi kabul kartı`} className="w-full border border-[#B5DFF2] bg-white" />
        ) : (
          <div className="aspect-[1131/1600] border border-[#B5DFF2] bg-white grid place-items-center text-sm text-[#3E6A88]">
            {error ? "" : "Kart hazırlanıyor…"}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button className="btn justify-center" type="button" disabled={!jpeg} onClick={() => void download()}>JPG indir</button>
          <button className="btn secondary justify-center" type="button" disabled={!jpeg} onClick={() => void shareNative()}>Paylaş</button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button className="btn ghost justify-center" type="button" onClick={() => openShare(`https://wa.me/?text=${encodeURIComponent(shareText)}`)}>WhatsApp</button>
          <button className="btn ghost justify-center" type="button" onClick={() => openShare(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${caption}`)}&url=${encodeURIComponent(pageUrl)}`)}>X</button>
          <button className="btn ghost justify-center" type="button" onClick={() => openShare(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`)}>LinkedIn</button>
        </div>
        <p className="text-xs text-[#3E6A88] text-center">
          Instagram görseli bağlantı olarak almaz. JPG’yi indirip hikâyeye ekleyin ya da telefondaki Paylaş ile Instagram’ı seçin.
        </p>
        {note ? <p className="text-sm text-[#0077C2] text-center">{note}</p> : null}
        <p className="text-[11px] text-center tracking-wide text-[#3E6A88]">{CARD_TAGS}</p>
      </div>
    </main>
  );
}

async function paintCard(input: { name: string; school: string; city: string }) {
  await document.fonts?.ready;
  const fonts = fontStacks();
  const template = await loadImage(TEMPLATE);
  if (!template) throw new Error("kart");
  const canvas = document.createElement("canvas");
  canvas.width = template.width;
  canvas.height = template.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(template, 0, 0);
  writeField(ctx, input.name.trim(), NAME_FIELD, fonts.sans);
  writeField(ctx, input.school.trim() || input.city.trim(), SCHOOL_FIELD, fonts.sans);
  return canvas.toDataURL("image/jpeg", 0.92);
}

function fontStacks() {
  const body = getComputedStyle(document.body);
  const sans = body.getPropertyValue("--font-sans").trim() || '"Segoe UI"';
  return { sans: `${sans}, "Segoe UI", sans-serif` };
}

function writeField(
  ctx: CanvasRenderingContext2D,
  text: string,
  field: { x: number; y: number; w: number; size: number },
  sans: string,
) {
  const value = text.trim();
  if (!value) return;
  const lines = linesOf(ctx, value, field.w, `600 ${field.size}px ${sans}`, Math.max(16, Math.round(field.size * 0.55)), 2);
  const gap = 6;
  const block = lines.reduce((sum, line) => sum + line.size, 0) + gap * (lines.length - 1);
  let y = field.y - block / 2;
  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (const line of lines) {
    ctx.font = `600 ${line.size}px ${sans}`;
    ctx.fillText(line.text, field.x, y);
    y += line.size + gap;
  }
}

function linesOf(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, font: string, min: number, maxLines = 2) {
  const size = Number(font.match(/(\d+)px/)?.[1] || 32);
  const family = font.replace(/^\d+\s+\d+px\s+/, "");
  const weight = font.match(/^(\d+)/)?.[1] || "600";
  let current = size;
  const words = text.split(/\s+/).filter(Boolean);
  while (current >= min) {
    ctx.font = `${weight} ${current}px ${family}`;
    const rows: string[] = [];
    let line = "";
    let fits = true;
    for (const word of words) {
      if (ctx.measureText(word).width > maxWidth) {
        fits = false;
        break;
      }
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > maxWidth && line) {
        rows.push(line);
        line = word;
      } else line = next;
    }
    if (line) rows.push(line);
    if (fits && rows.length <= maxLines) return rows.map((row) => ({ text: row, size: current }));
    current -= 2;
  }
  ctx.font = `${weight} ${min}px ${family}`;
  return [{ text: text.slice(0, 48), size: min }];
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
