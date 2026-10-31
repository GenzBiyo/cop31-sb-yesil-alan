"use client";

import { useEffect, useState } from "react";
import { CARD_TAGS, cardFileName, cardShareCaption } from "@/lib/ambassador-card";

const W = 1080;
const H = 1350;
const NAVY = "#0B1C33";
const BLUE = "#0C5F96";
const RED = "#C4161D";
const PAPER = "#F4F1EA";
const INK = "#0B1C33";
const MUTED = "#5A636C";
const LINE = "#D2CCC2";

const SAGLIK_SRCS = ["/hatira/logo-saglik.jpg", "/icons/saglik-symbol.png", "/icons/saglik-512.png"];
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
    <main className="min-h-screen bg-[#E6E1D8] text-[#0B1C33] px-4 py-8">
      <div className="mx-auto max-w-[440px] space-y-4">
        <div className="text-center">
          <p className="text-xs font-bold tracking-[0.22em] text-[#0C5F96]">COP31 TÜRKİYE · ANTALYA</p>
          <h1 className="display text-4xl mt-1">Tebrikler</h1>
          <p className="text-sm text-[#5A636C] mt-1">İklim Sağlık Elçisi kabul kartınız. JPG indirip paylaşabilirsiniz.</p>
        </div>
        {error ? <p className="text-sm text-[#C4161D] text-center">{error}</p> : null}
        {jpeg ? (
          <img src={jpeg} alt={`${name} İklim Sağlık Elçisi kabul kartı`} className="w-full border border-[#D2CCC2] bg-[#F4F1EA] shadow-sm" />
        ) : (
          <div className="aspect-[1080/1350] border border-[#D2CCC2] bg-[#F4F1EA] grid place-items-center text-sm text-[#5A636C]">
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
        <p className="text-xs text-[#5A636C] text-center">
          Instagram görseli bağlantı olarak almaz. JPG’yi indirip hikâyeye ekleyin ya da telefondaki Paylaş ile Instagram’ı seçin.
        </p>
        {note ? <p className="text-sm text-[#0C5F96] text-center">{note}</p> : null}
        <p className="text-[11px] text-center tracking-wide text-[#5A636C]">{CARD_TAGS}</p>
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
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = NAVY;
  ctx.lineWidth = 3;
  ctx.strokeRect(32, 32, W - 64, H - 64);
  ctx.strokeStyle = RED;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(46, 46, W - 92, H - 92);

  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  const rowY = 74;
  const rowH = 214;
  const sealW = 204;
  const copW = 448;
  const gap = 40;
  const rowW = sealW + gap + copW;
  const rowX = (W - rowW) / 2;
  if (saglik) drawLogo(ctx, saglik, rowX, rowY, sealW, rowH);
  else drawMark(ctx, "SB", rowX, rowY, sealW, rowH, fonts.sans);
  if (saglik && cop) {
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rowX + sealW + gap / 2, rowY + 36);
    ctx.lineTo(rowX + sealW + gap / 2, rowY + rowH - 36);
    ctx.stroke();
  }
  if (cop) drawLogo(ctx, cop, rowX + sealW + gap, rowY + 24, copW, rowH - 48);
  else drawMark(ctx, "COP31", rowX + sealW + gap, rowY, copW, rowH, fonts.sans);

  let y = 322;
  fillTracked(ctx, "TÜRKİYE CUMHURİYETİ", W / 2, y, 3.4, `600 18px ${fonts.sans}`, MUTED);
  y += 32;
  ctx.fillStyle = INK;
  ctx.font = `600 36px ${fonts.sans}`;
  ctx.fillText("SAĞLIK BAKANLIĞI", W / 2, y);
  y += 50;
  ctx.fillStyle = RED;
  ctx.fillRect(W / 2 - 84, y, 168, 2);
  y += 18;
  fillTracked(ctx, "COP31  ·  ANTALYA", W / 2, y, 2.6, `600 18px ${fonts.sans}`, MUTED);
  y += 32;
  ctx.fillStyle = MUTED;
  ctx.font = `600 24px ${fonts.display}`;
  ctx.fillText("Sağlıklı insan, sağlıklı gezegen", W / 2, y);
  y += 62;

  fillTracked(ctx, "KABUL EDİLDİ", W / 2, y, 4.2, `600 18px ${fonts.sans}`, RED);
  y += 34;
  ctx.fillStyle = INK;
  ctx.font = `600 72px ${fonts.display}`;
  ctx.fillText("Tebrikler", W / 2, y);
  y += 86;

  const nameLines = linesOf(ctx, input.name.trim() || "İklim Sağlık Elçisi", 900, `600 54px ${fonts.display}`, 32, 2);
  ctx.fillStyle = BLUE;
  for (const line of nameLines) {
    ctx.font = `600 ${line.size}px ${fonts.display}`;
    ctx.fillText(line.text, W / 2, y);
    y += line.size + 6;
  }

  y += 16;
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(180, y);
  ctx.lineTo(W - 180, y);
  ctx.stroke();
  y += 22;

  ctx.fillStyle = INK;
  ctx.font = `600 34px ${fonts.sans}`;
  ctx.fillText("İklim Sağlık Elçisi", W / 2, y);
  y += 44;
  ctx.fillStyle = MUTED;
  ctx.font = `600 20px ${fonts.sans}`;
  ctx.fillText("Climate Health Ambassador", W / 2, y);
  y += 36;

  const place = [input.school.trim(), input.city.trim()].filter(Boolean).join("  ·  ");
  if (place) {
    const placeLines = linesOf(ctx, place, 860, `600 24px ${fonts.sans}`, 16, 2);
    ctx.fillStyle = NAVY;
    for (const line of placeLines) {
      ctx.font = `600 ${line.size}px ${fonts.sans}`;
      ctx.fillText(line.text, W / 2, y);
      y += line.size + 8;
    }
  }

  const boxH = 156;
  const footerTop = H - 148;
  let boxTop = y + 28;
  const maxTop = footerTop - boxH - 24;
  if (boxTop > maxTop) boxTop = maxTop;
  if (boxTop < y + 16) boxTop = y + 16;
  const boxX = 132;
  const boxW = W - 264;
  ctx.strokeStyle = NAVY;
  ctx.lineWidth = 1.25;
  ctx.strokeRect(boxX, boxTop, boxW, boxH);
  ctx.fillStyle = RED;
  ctx.fillRect(boxX, boxTop, 6, boxH);

  const blockH = 22 + 14 + 30 + 14 + 26;
  let by = boxTop + (boxH - blockH) / 2;
  ctx.fillStyle = MUTED;
  ctx.font = `600 22px ${fonts.sans}`;
  ctx.fillText("Gönüllü ekibimizdesiniz", W / 2, by);
  by += 36;
  ctx.fillStyle = BLUE;
  ctx.font = `600 30px ${fonts.sans}`;
  ctx.fillText("Antalya  ·  Sağlık Pavilionu", W / 2, by);
  by += 44;
  ctx.fillStyle = INK;
  ctx.font = `600 26px ${fonts.sans}`;
  ctx.fillText("9–20 Kasım 2026", W / 2, by);

  ctx.fillStyle = INK;
  ctx.font = `600 30px ${fonts.display}`;
  ctx.fillText("COP31 Türkiye", W / 2, footerTop);
  ctx.fillStyle = MUTED;
  ctx.font = `600 18px ${fonts.sans}`;
  ctx.fillText("#COP31SaglikBakanligi", W / 2, footerTop + 42);
  ctx.fillText("#SaglikliInsanSaglikliGezegen", W / 2, footerTop + 70);
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

function drawLogo(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const cut = knockoutMatte(img);
  const scale = Math.min(w / cut.width, h / cut.height);
  const dw = cut.width * scale;
  const dh = cut.height * scale;
  ctx.drawImage(cut, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function drawMark(ctx: CanvasRenderingContext2D, label: string, x: number, y: number, w: number, h: number, sans: string) {
  ctx.save();
  ctx.fillStyle = RED;
  ctx.font = `600 ${Math.floor(h * 0.22)}px ${sans}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + w / 2, y + h / 2);
  ctx.restore();
}

function fillTracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  tracking: number,
  font: string,
  color: string,
) {
  ctx.font = font;
  ctx.fillStyle = color;
  const chars = Array.from(text);
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((sum, width) => sum + width, 0) + tracking * Math.max(0, chars.length - 1);
  let x = cx - total / 2;
  const align = ctx.textAlign;
  ctx.textAlign = "left";
  chars.forEach((ch, i) => {
    ctx.fillText(ch, x, y);
    x += widths[i] + tracking;
  });
  ctx.textAlign = align;
}

function knockoutMatte(img: HTMLImageElement) {
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const g = canvas.getContext("2d", { willReadFrequently: true });
  if (!g) return img;
  g.drawImage(img, 0, 0);
  const frame = g.getImageData(0, 0, canvas.width, canvas.height);
  const d = frame.data;
  const at = (x: number, y: number) => (y * canvas.width + x) * 4;
  const corners = [at(0, 0), at(canvas.width - 1, 0), at(0, canvas.height - 1), at(canvas.width - 1, canvas.height - 1)];
  let white = 0;
  let black = 0;
  let clear = 0;
  for (const i of corners) {
    if (d[i + 3] < 24) {
      clear += 1;
      continue;
    }
    const r = d[i];
    const gch = d[i + 1];
    const b = d[i + 2];
    if (r > 240 && gch > 240 && b > 240) white += 1;
    if (r < 24 && gch < 24 && b < 24) black += 1;
  }
  if (clear < 3 && white >= 2) {
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] > 236 && d[i + 1] > 236 && d[i + 2] > 236) d[i + 3] = 0;
    }
    g.putImageData(frame, 0, 0);
  } else if (clear < 3 && black >= 2) {
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i];
      const gch = d[i + 1];
      const b = d[i + 2];
      const max = Math.max(r, gch, b);
      const min = Math.min(r, gch, b);
      const redInk = r > 80 && r > gch * 1.8 && r > b * 1.8;
      if (!redInk && (max < 42 || (max < 72 && max - min < 18))) d[i + 3] = 0;
    }
    g.putImageData(frame, 0, 0);
  }
  return canvas;
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
