"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { speakerCardFileName, speakerShareCaption, SPEAKER_CARD_TAGS, type SpeakerSession, type SpeakerShare } from "@/lib/speaker-share";

const W = 1080;
const H = 1350;

export function SpeakerShareCard({ speaker }: { speaker: SpeakerShare }) {
  const [sessionId, setSessionId] = useState(speaker.sessions[0]?.id || "");
  const session = speaker.sessions.find((row) => row.id === sessionId) || speaker.sessions[0] || null;
  const [jpeg, setJpeg] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const caption = speakerShareCaption(speaker.name, session);
  const pageUrl = typeof window !== "undefined" ? window.location.href : "";

  useEffect(() => {
    let cancel = false;
    setJpeg("");
    void paintCard(speaker, session)
      .then((url) => {
        if (!cancel) setJpeg(url);
      })
      .catch(() => {
        if (!cancel) setError("Kart hazırlanamadı. Sayfayı yenileyin.");
      });
    return () => {
      cancel = true;
    };
  }, [speaker, session]);

  async function download() {
    if (!jpeg) return;
    setNote("");
    const blob = await (await fetch(jpeg)).blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = speakerCardFileName(speaker.name);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  async function shareNative() {
    if (!jpeg) return;
    setNote("");
    const blob = await (await fetch(jpeg)).blob();
    const file = new File([blob], speakerCardFileName(speaker.name), { type: "image/jpeg" });
    const payload: ShareData = { title: "Konuşuyorum", text: `${caption}\n${pageUrl}`, files: [file] };
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
          <h1 className="display text-4xl mt-1">Konuşuyorum</h1>
          <p className="text-sm text-[#3E6A88] mt-1">
            {speaker.name} için sosyal medya kartı. JPG indirip hikâye veya gönderi olarak paylaşın.
          </p>
        </div>
        {speaker.sessions.length > 1 ? (
          <label className="block text-sm text-[#3E6A88]">
            Karttaki oturum
            <select className="field mt-1" value={session?.id || ""} onChange={(e) => setSessionId(e.target.value)}>
              {speaker.sessions.map((row) => (
                <option key={row.id} value={row.id}>{row.title}</option>
              ))}
            </select>
          </label>
        ) : null}
        {!speaker.sessions.length ? (
          <p className="text-sm text-[#3E6A88] text-center">
            Adınız bir panele yazılınca kartta o oturumun başlığı görünür. Şimdilik Sağlık Pavyonu kartı hazır.
          </p>
        ) : null}
        {error ? <p className="text-sm text-[#E31C23] text-center">{error}</p> : null}
        {jpeg ? (
          <img src={jpeg} alt={`${speaker.name} konuşuyorum kartı`} className="w-full border border-[#B5DFF2] bg-white" />
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
          <button className="btn ghost justify-center" type="button" onClick={() => openShare(`https://twitter.com/intent/tweet?text=${encodeURIComponent(caption)}&url=${encodeURIComponent(pageUrl)}`)}>X</button>
          <button className="btn ghost justify-center" type="button" onClick={() => openShare(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`)}>LinkedIn</button>
        </div>
        <p className="text-xs text-[#3E6A88] text-center">
          Instagram görseli bağlantı olarak almaz. JPG’yi indirip hikâyeye ekleyin ya da telefondaki Paylaş ile Instagram’ı seçin.
        </p>
        {note ? <p className="text-sm text-[#0077C2] text-center">{note}</p> : null}
        <p className="text-[11px] text-center tracking-wide text-[#3E6A88]">{SPEAKER_CARD_TAGS}</p>
        <p className="text-center">
          <Link className="text-sm text-[#0077C2] underline" href="/konusmacilar">Tüm konuşmacılar</Link>
        </p>
      </div>
    </main>
  );
}

async function paintCard(speaker: SpeakerShare, session: SpeakerSession | null) {
  await document.fonts?.ready;
  const fonts = fontStacks();
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");

  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#08385C");
  sky.addColorStop(0.45, "#0B4F86");
  sky.addColorStop(1, "#061525");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.fillRect(0, 0, W, 168);
  ctx.fillStyle = "#E31C23";
  ctx.fillRect(0, 168, W, 6);
  ctx.fillStyle = "#00A3E0";
  ctx.fillRect(0, 174, W, 3);

  ctx.fillStyle = "#D7F1FC";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = `600 22px ${fonts.sans}`;
  ctx.fillText("COP31  ·  ANTALYA  ·  9–20 KASIM 2026", W / 2, 58);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `600 28px ${fonts.sans}`;
  ctx.fillText("T.C. SAĞLIK BAKANLIĞI", W / 2, 98);

  const headline = session?.headline || "Konuşuyorum";
  const lead = session?.lead || "Sağlık Pavyonu'nda";
  ctx.fillStyle = "#7ED4F5";
  ctx.font = `600 22px ${fonts.sans}`;
  ctx.fillText("SAĞLIK PAVYONU", W / 2, 230);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `600 92px ${fonts.display}`;
  ctx.fillText(headline, W / 2, 268);
  ctx.fillStyle = "#D7F1FC";
  ctx.font = `600 32px ${fonts.sans}`;
  ctx.fillText(lead, W / 2, 390);

  const subject = session?.title || "COP31 Sağlık Pavyonu";
  const titleLines = fitLines(ctx, subject, 900, `600 46px ${fonts.sans}`, 28, 3);
  let y = 460;
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  for (const line of titleLines) {
    ctx.font = `600 ${line.size}px ${fonts.sans}`;
    ctx.fillText(line.text, W / 2, y);
    y += line.size + 8;
  }

  y += 14;
  ctx.fillStyle = "#7ED4F5";
  if (session?.when) {
    ctx.font = `600 26px ${fonts.sans}`;
    ctx.fillText(session.when, W / 2, y);
    y += 40;
  }
  if (session?.location && y < 860) {
    const place = fitLines(ctx, session.location, 860, `600 24px ${fonts.sans}`, 18, 1);
    ctx.font = `600 ${place[0].size}px ${fonts.sans}`;
    ctx.fillText(place[0].text, W / 2, y);
    y += place[0].size + 12;
  }
  if (session?.talkTitle && y < 900) {
    const quote = fitLines(ctx, `“${session.talkTitle}”`, 860, `600 26px ${fonts.display}`, 18, 2);
    ctx.fillStyle = "#FFFFFF";
    for (const line of quote) {
      if (y > 930) break;
      ctx.font = `600 ${line.size}px ${fonts.display}`;
      ctx.fillText(line.text, W / 2, y);
      y += line.size + 6;
    }
  }

  const photo = speaker.photoPath ? await loadImage(speaker.photoPath) : null;
  if (photo) drawAvatar(ctx, photo, W / 2, 1010, 62);

  const nameLines = fitLines(ctx, speaker.name, 900, `600 46px ${fonts.display}`, 28, 2);
  let ny = photo ? 1090 : 1080;
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  for (const line of nameLines) {
    ctx.font = `600 ${line.size}px ${fonts.display}`;
    ctx.fillText(line.text, W / 2, ny);
    ny += line.size + 4;
  }
  if (speaker.title && ny < 1240) {
    const role = fitLines(ctx, speaker.title, 860, `600 24px ${fonts.sans}`, 18, 1);
    ctx.fillStyle = "#D7F1FC";
    ctx.font = `600 ${role[0].size}px ${fonts.sans}`;
    ctx.fillText(role[0].text, W / 2, ny);
    ny += role[0].size + 6;
  }
  if (speaker.organization && ny < 1276) {
    const org = fitLines(ctx, speaker.organization, 860, `600 22px ${fonts.sans}`, 16, 1);
    ctx.fillStyle = "#7ED4F5";
    ctx.font = `600 ${org[0].size}px ${fonts.sans}`;
    ctx.fillText(org[0].text, W / 2, ny);
  }

  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.font = `600 18px ${fonts.sans}`;
  ctx.fillText(SPEAKER_CARD_TAGS, W / 2, H - 48);
  return canvas.toDataURL("image/jpeg", 0.92);
}

function drawAvatar(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, r: number) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r + 6, 0, Math.PI * 2);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  const scale = Math.max((r * 2) / img.width, (r * 2) / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
  ctx.restore();
}

function fontStacks() {
  const body = getComputedStyle(document.body);
  const sans = body.getPropertyValue("--font-sans").trim() || '"Segoe UI"';
  const display = body.getPropertyValue("--font-display").trim() || "Georgia";
  return {
    sans: `${sans}, "Segoe UI", sans-serif`,
    display: `${display}, Georgia, serif`,
  };
}

function fitLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, font: string, min: number, maxLines: number) {
  const size = Number(font.match(/(\d+)px/)?.[1] || 32);
  const family = font.replace(/^\d+\s+\d+px\s+/, "");
  const weight = font.match(/^(\d+)/)?.[1] || "600";
  const words = text.split(/\s+/).filter(Boolean);
  let current = size;
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
  return [{ text: words.slice(0, 12).join(" "), size: min }];
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
