"use client";

import { useEffect, useState } from "react";
import { CARD_TAGS, cardFileName, cardShareCaption } from "@/lib/ambassador-card";

const W = 1080;
const H = 1350;
const NAVY = "#0B1C33";
const BLUE = "#0077C2";
const TEAL = "#00A3E0";
const RED = "#E31C23";
const CREAM = "#F4FBFE";
const INK = "#0B1C33";
const MUTED = "#3E6A88";

const SAGLIK_SRCS = ["/icons/saglik-192.png", "/hatira/logo-saglik.jpg"];
const COP_SRCS = ["/brand/cop31-turkiye.png", "/hatira/logo-cop31.png"];

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
          <p className="text-sm text-[#3E6A88] mt-1">İklim Sağlık Elçisi kabul kartınız. JPG indirip paylaşabilirsiniz.</p>
        </div>
        {error ? <p className="text-sm text-[#E31C23] text-center">{error}</p> : null}
        {jpeg ? (
          <img src={jpeg} alt={`${name} İklim Sağlık Elçisi kabul kartı`} className="w-full border border-[#B5DFF2] bg-white" />
        ) : (
          <div className="aspect-[1080/1350] border border-[#B5DFF2] bg-white grid place-items-center text-sm text-[#3E6A88]">
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
  const [saglik, cop] = await Promise.all([loadFirst(SAGLIK_SRCS), loadFirst(COP_SRCS)]);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  drawCard(ctx, fonts, input, saglik, cop);
  return canvas.toDataURL("image/jpeg", 0.92);
}

function fontStacks() {
  const body = getComputedStyle(document.body);
  const display = body.getPropertyValue("--font-display").trim() || "Georgia";
  const sans = body.getPropertyValue("--font-sans").trim() || '"Segoe UI"';
  return {
    display: `${display}, Georgia, "Times New Roman", serif`,
    sans: `${sans}, "Segoe UI", sans-serif`,
  };
}

function drawCard(
  ctx: CanvasRenderingContext2D,
  fonts: { display: string; sans: string },
  input: { name: string; school: string; city: string },
  saglik: HTMLImageElement | null,
  cop: HTMLImageElement | null,
) {
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = BLUE;
  ctx.fillRect(0, 0, W, 392);
  ctx.fillStyle = RED;
  ctx.fillRect(0, 392, W, 10);
  ctx.fillStyle = TEAL;
  ctx.fillRect(0, 402, W, 6);

  logoTile(ctx, saglik, 336, 36, 150, 150, "SB");
  logoTile(ctx, cop, 502, 52, 230, 118, "31");

  ctx.textAlign = "center";
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `700 20px ${fonts.sans}`;
  ctx.fillText("TÜRKİYE CUMHURİYETİ", W / 2, 230);
  ctx.font = `700 36px ${fonts.sans}`;
  ctx.fillText("SAĞLIK BAKANLIĞI", W / 2, 276);
  ctx.font = `600 22px ${fonts.sans}`;
  ctx.fillText("COP31  ·  ANTALYA", W / 2, 318);
  ctx.font = `500 20px ${fonts.sans}`;
  ctx.fillStyle = "#D7F3FF";
  ctx.fillText("Sağlıklı insan, sağlıklı gezegen", W / 2, 356);

  let y = 470;
  ctx.fillStyle = RED;
  ctx.font = `700 22px ${fonts.sans}`;
  ctx.fillText("KABUL EDİLDİ", W / 2, y);
  y += 92;
  ctx.fillStyle = INK;
  ctx.font = `600 92px ${fonts.display}`;
  ctx.fillText("Tebrikler", W / 2, y);

  y += 78;
  const nameLines = linesOf(ctx, input.name.trim() || "İklim Sağlık Elçisi", 920, `600 60px ${fonts.display}`, 36, 2);
  ctx.fillStyle = BLUE;
  for (const line of nameLines) {
    ctx.font = `600 ${line.size}px ${fonts.display}`;
    ctx.fillText(line.text, W / 2, y);
    y += Math.min(line.size + 8, 68);
  }

  y += 28;
  ctx.strokeStyle = "#B5DFF2";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(180, y);
  ctx.lineTo(W - 180, y);
  ctx.stroke();

  ctx.fillStyle = INK;
  ctx.font = `700 36px ${fonts.sans}`;
  ctx.fillText("İklim Sağlık Elçisi", W / 2, y + 58);
  ctx.fillStyle = MUTED;
  ctx.font = `600 22px ${fonts.sans}`;
  ctx.fillText("Climate Health Ambassador", W / 2, y + 98);

  const place = [input.school.trim(), input.city.trim()].filter(Boolean).join("  ·  ");
  let placeEnd = y + 130;
  if (place) {
    const placeLines = linesOf(ctx, place, 900, `600 26px ${fonts.sans}`, 18, 2);
    ctx.fillStyle = NAVY;
    let placeY = y + 156;
    for (const line of placeLines) {
      ctx.font = `600 ${line.size}px ${fonts.sans}`;
      ctx.fillText(line.text, W / 2, placeY);
      placeY += line.size + 8;
    }
    placeEnd = placeY;
  }

  const boxTop = Math.min(placeEnd + 28, 1008);
  roundRect(ctx, 120, boxTop, W - 240, 176, 8);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = BLUE;
  ctx.stroke();
  ctx.fillStyle = MUTED;
  ctx.font = `600 22px ${fonts.sans}`;
  ctx.fillText("Gönüllü ekibimizdesiniz", W / 2, boxTop + 48);
  ctx.fillStyle = BLUE;
  ctx.font = `700 28px ${fonts.sans}`;
  ctx.fillText("Antalya  ·  Sağlık Pavilionu", W / 2, boxTop + 96);
  ctx.fillStyle = INK;
  ctx.font = `600 26px ${fonts.sans}`;
  ctx.fillText("9–20 Kasım 2026", W / 2, boxTop + 140);

  ctx.fillStyle = BLUE;
  ctx.fillRect(0, H - 168, W, 168);
  ctx.fillStyle = RED;
  ctx.fillRect(0, H - 168, W, 8);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `600 28px ${fonts.display}`;
  ctx.fillText("COP31 Türkiye", W / 2, H - 112);
  ctx.font = `600 20px ${fonts.sans}`;
  ctx.fillText("#COP31SaglikBakanligi", W / 2, H - 74);
  ctx.fillText("#SaglikliInsanSaglikliGezegen", W / 2, H - 44);

  ctx.strokeStyle = BLUE;
  ctx.lineWidth = 18;
  ctx.strokeRect(9, 9, W - 18, H - 18);
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

function logoTile(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  x: number,
  y: number,
  w: number,
  h: number,
  mark: string,
) {
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(x, y, w, h);
  if (!img) {
    ctx.fillStyle = BLUE;
    ctx.font = `700 ${Math.floor(h * 0.42)}px Segoe UI, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(mark, x + w / 2, y + h * 0.64);
    return;
  }
  const scale = Math.min((w - 16) / img.width, (h - 16) / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function loadFirst(srcs: string[]) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const next = (index: number) => {
      if (index >= srcs.length) {
        resolve(null);
        return;
      }
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => next(index + 1);
      img.src = srcs[index];
    };
    next(0);
  });
}
