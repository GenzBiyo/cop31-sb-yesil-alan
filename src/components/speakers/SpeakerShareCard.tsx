"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { speakerCardFileName, speakerShareCaption, SPEAKER_CARD_TAGS, type SpeakerLineupPerson, type SpeakerSession, type SpeakerShare } from "@/lib/speaker-share";
import { useI18n } from "@/components/I18nProvider";

const W = 1080;
const H = 1350;

export function SpeakerShareCard({ speaker }: { speaker: SpeakerShare }) {
  const { locale } = useI18n();
  const english = locale === "en";
  const [sessionId, setSessionId] = useState(speaker.sessions[0]?.id || "");
  const session = speaker.sessions.find((row) => row.id === sessionId) || speaker.sessions[0] || null;
  const [jpeg, setJpeg] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const caption = speakerShareCaption(speaker.name, session, english ? "en" : "tr");
  const pageUrl = typeof window !== "undefined" ? window.location.href : "";

  useEffect(() => {
    let cancel = false;
    setJpeg("");
    paintCard(speaker, session, english)
      .then((url) => {
        if (!cancel) setJpeg(url);
      })
      .catch(() => {
        if (!cancel) setError(english ? "The card could not be prepared. Refresh the page." : "Kart hazırlanamadı. Sayfayı yenileyin.");
      });
    return () => {
      cancel = true;
    };
  }, [speaker, session, english]);

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
    setNote(english
      ? "This browser cannot share the image directly. The JPG was downloaded; add it from your gallery."
      : "Bu tarayıcı görseli doğrudan paylaşamıyor. JPG indirildi; galeriden Instagram, WhatsApp veya LinkedIn’e ekleyin.");
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
          <h1 className="display text-4xl mt-1">{english ? "Panel poster" : "Panel afişi"}</h1>
          <p className="text-sm text-[#3E6A88] mt-1">
            {english
              ? `Poster for ${speaker.name}. The session title, time and lineup are on the card.`
              : `${speaker.name} için panel afişi. Başlık, saat ve kadro kartın üzerindedir.`}
          </p>
        </div>
        {speaker.sessions.length > 1 ? (
          <label className="block text-sm text-[#3E6A88]">
            {english ? "Session on the card" : "Karttaki oturum"}
            <select className="field mt-1" value={session?.id || ""} onChange={(e) => setSessionId(e.target.value)}>
              {speaker.sessions.map((row) => (
                <option key={row.id} value={row.id}>{row.title}</option>
              ))}
            </select>
          </label>
        ) : null}
        {!speaker.sessions.length ? (
          <p className="text-sm text-[#3E6A88] text-center">
            {english
              ? "When your name is on a panel, that lineup appears on the poster. The Health Pavilion poster is ready for now."
              : "Adınız bir panele yazılınca afişte o oturumun kadrosu görünür. Şimdilik Sağlık Pavyonu afişi hazır."}
          </p>
        ) : null}
        {error ? <p className="text-sm text-[#E31C23] text-center">{error}</p> : null}
        {jpeg ? (
          <img src={jpeg} alt={english ? `${speaker.name} panel poster` : `${speaker.name} panel afişi`} className="w-full border border-[#B5DFF2] bg-white" />
        ) : (
          <div className="aspect-[1080/1350] border border-[#B5DFF2] bg-white grid place-items-center text-sm text-[#3E6A88]">
            {error ? "" : "Kart hazırlanıyor…"}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button className="btn justify-center" type="button" disabled={!jpeg} onClick={() => void download()}>{english ? "Download JPG" : "JPG indir"}</button>
          <button className="btn secondary justify-center" type="button" disabled={!jpeg} onClick={() => void shareNative()}>{english ? "Share" : "Paylaş"}</button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button className="btn ghost justify-center" type="button" onClick={() => openShare(`https://wa.me/?text=${encodeURIComponent(shareText)}`)}>WhatsApp</button>
          <button className="btn ghost justify-center" type="button" onClick={() => openShare(`https://twitter.com/intent/tweet?text=${encodeURIComponent(caption)}&url=${encodeURIComponent(pageUrl)}`)}>X</button>
          <button className="btn ghost justify-center" type="button" onClick={() => openShare(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`)}>LinkedIn</button>
        </div>
        <p className="text-xs text-[#3E6A88] text-center">
          {english
            ? "Instagram does not take the image as a link. Download the JPG and add it to your story."
            : "Instagram görseli bağlantı olarak almaz. JPG’yi indirip hikâyeye ekleyin ya da telefondaki Paylaş ile Instagram’ı seçin."}
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

async function paintCard(speaker: SpeakerShare, session: SpeakerSession | null, english: boolean) {
  await document.fonts?.ready;
  const fonts = fontStacks();
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  drawGround(ctx);
  const [seal, mark] = await Promise.all([
    loadImage("/brand/logo-saglik-beyaz.png"),
    loadImage("/brand/logo-cop31-beyaz.png"),
  ]);
  if (seal) ctx.drawImage(seal, 56, 40, 148, 148);
  if (mark) {
    const height = 168;
    const width = height * (mark.width / mark.height);
    ctx.drawImage(mark, W - 48 - width, 28, width, height);
  }

  const people = session?.lineup.length
    ? session.lineup
    : [{
        name: speaker.name,
        role: "panelist",
        title: speaker.title,
        organization: speaker.organization,
        photoPath: speaker.photoPath,
      }];
  const photos = new Map<string, HTMLImageElement | null>();
  await Promise.all(people.map(async (person) => {
    photos.set(person.photoPath, person.photoPath ? await loadImage(person.photoPath) : null);
  }));

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const metaY = 214;
  drawMeta(ctx, fonts.sans, metaY, [
    { icon: 0, text: shortDate(session?.date || "", english) },
    { icon: 1, text: clockLabel(session) },
    { icon: 2, text: placeLabel(session?.location || "", english) },
  ].filter((part) => part.text));

  const title = (session?.title || (english ? "Health Pavilion" : "Sağlık Pavyonu")).toLocaleUpperCase("tr-TR");
  const titleLines = fitLines(ctx, title, 920, `600 62px ${fonts.sans}`, 32, 3);
  let y = 286;
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (const line of titleLines) {
    ctx.font = `600 ${line.size}px ${fonts.sans}`;
    ctx.fillText(line.text, W / 2, y);
    y += line.size + 6;
  }
  y += 16;
  y = drawBadge(ctx, fonts.sans, y, badgeLabel(session?.kind || "panel", english));
  y += 28;
  drawPeople(ctx, fonts.sans, people, photos, y, english);
  return canvas.toDataURL("image/jpeg", 0.92);
}

function drawGround(ctx: CanvasRenderingContext2D) {
  const sky = ctx.createLinearGradient(0, 0, W * 0.2, H);
  sky.addColorStop(0, "#1C9A68");
  sky.addColorStop(0.42, "#128A62");
  sky.addColorStop(1, "#075568");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(860, 40, 10, 900, 80, 460);
  glow.addColorStop(0, "rgba(255,255,255,0.16)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  drawLeaf(ctx, 980, 430, 150, -0.5);
  drawLeaf(ctx, 70, 1180, 90, 0.8);
  ctx.beginPath();
  ctx.moveTo(0, 1210);
  ctx.bezierCurveTo(220, 1120, 420, 1320, 640, 1200);
  ctx.bezierCurveTo(820, 1100, 960, 1280, W, 1160);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fillStyle = "rgba(6, 58, 78, 0.45)";
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, 1280);
  ctx.bezierCurveTo(260, 1200, 480, 1360, 760, 1260);
  ctx.bezierCurveTo(900, 1210, 1000, 1300, W, 1240);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fillStyle = "rgba(186, 235, 255, 0.16)";
  ctx.fill();
}

function drawLeaf(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rotation: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.fillStyle = "rgba(214, 245, 170, 0.28)";
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.28, size, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.8);
  ctx.quadraticCurveTo(size * 0.08, 0, 0, size * 0.8);
  ctx.stroke();
  ctx.restore();
}

function drawMeta(ctx: CanvasRenderingContext2D, sans: string, y: number, parts: { icon: number; text: string }[]) {
  let size = 24;
  ctx.font = `600 ${size}px ${sans}`;
  let widths = parts.map((part) => ctx.measureText(part.text).width + 34);
  while (size > 16 && widths.reduce((sum, width) => sum + width, 0) + 28 * (parts.length - 1) > 960) {
    size -= 2;
    ctx.font = `600 ${size}px ${sans}`;
    widths = parts.map((part) => ctx.measureText(part.text).width + 34);
  }
  ctx.font = `600 ${size}px ${sans}`;
  const gap = 28;
  const total = widths.reduce((sum, width) => sum + width, 0) + gap * (parts.length - 1);
  let x = (W - total) / 2;
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#FFFFFF";
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 2;
  parts.forEach((part, index) => {
    strokeIcon(ctx, x + 10, y, part.icon);
    ctx.textAlign = "left";
    ctx.fillText(part.text, x + 30, y);
    x += widths[index];
    if (index < parts.length - 1) {
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath();
      ctx.moveTo(x + 8, y - 14);
      ctx.lineTo(x + 8, y + 14);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      x += gap;
    }
  });
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.moveTo(72, y + 32);
  ctx.lineTo(W - 72, y + 32);
  ctx.stroke();
}

function strokeIcon(ctx: CanvasRenderingContext2D, x: number, y: number, kind: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  if (kind === 0) {
    ctx.rect(-8, -6, 16, 13);
    ctx.moveTo(-5, -9);
    ctx.lineTo(-5, -4);
    ctx.moveTo(5, -9);
    ctx.lineTo(5, -4);
  } else if (kind === 1) {
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -4);
    ctx.moveTo(0, 0);
    ctx.lineTo(4, 2);
  } else {
    ctx.arc(0, -2, 5, 0, Math.PI * 2);
    ctx.moveTo(-6, 8);
    ctx.lineTo(0, -1);
    ctx.lineTo(6, 8);
  }
  ctx.stroke();
  ctx.restore();
}

function drawBadge(ctx: CanvasRenderingContext2D, sans: string, y: number, label: string) {
  ctx.font = `600 22px ${sans}`;
  const width = ctx.measureText(label).width + 44;
  const x = (W - width) / 2;
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, width, 40, 20);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 92, y + 20);
  ctx.lineTo(x - 16, y + 20);
  ctx.moveTo(x + width + 16, y + 20);
  ctx.lineTo(x + width + 92, y + 20);
  ctx.stroke();
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, W / 2, y + 21);
  return y + 40;
}

function drawPeople(
  ctx: CanvasRenderingContext2D,
  sans: string,
  people: SpeakerLineupPerson[],
  photos: Map<string, HTMLImageElement | null>,
  top: number,
  english: boolean,
) {
  const lead = people.length >= 3 ? people[0] : null;
  const rest = lead ? people.slice(1) : people;
  let y = top;
  if (lead) {
    drawFeatured(ctx, sans, lead, photos.get(lead.photoPath) || null, y, roleLabel(lead, 1, english));
    y += 236;
  }
  if (!rest.length) return;
  const perRow = rest.length <= 4 ? rest.length : rest.length <= 6 ? 3 : 4;
  const rows: SpeakerLineupPerson[][] = [];
  for (let index = 0; index < rest.length; index += perRow) rows.push(rest.slice(index, index + perRow));
  const room = 1210 - y;
  const rowHeight = Math.min(250, room / rows.length);
  const radius = Math.max(46, Math.min(86, rowHeight * 0.32));
  let speakerNo = lead && lead.role !== "moderator" ? 2 : 1;
  rows.forEach((row, rowIndex) => {
    const cy = y + rowIndex * rowHeight + radius + 8;
    const gap = W / (row.length + 1);
    row.forEach((person, index) => {
      const number = person.role === "moderator" || person.role === "acilis" || person.role === "kapanis" ? 1 : speakerNo++;
      drawPortrait(ctx, photos.get(person.photoPath) || null, gap * (index + 1), cy, radius, person.name);
      const label = roleLabel(person, number, english);
      const name = cardName(person);
      let textY = cy + radius + 16;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = "#D9FFE8";
      ctx.font = `600 18px ${sans}`;
      ctx.fillText(label, gap * (index + 1), textY);
      textY += 24;
      const lines = fitLines(ctx, name, gap - 16, `600 22px ${sans}`, 15, 2);
      ctx.fillStyle = "#FFFFFF";
      for (const line of lines) {
        ctx.font = `600 ${line.size}px ${sans}`;
        ctx.fillText(line.text, gap * (index + 1), textY);
        textY += line.size + 2;
      }
      if (person.organization) {
        const org = fitLines(ctx, person.organization, gap - 12, `600 16px ${sans}`, 12, 2);
        ctx.fillStyle = "rgba(255,255,255,0.82)";
        for (const line of org) {
          ctx.font = `600 ${line.size}px ${sans}`;
          ctx.fillText(line.text, gap * (index + 1), textY);
          textY += line.size + 2;
        }
      }
    });
  });
}

function drawFeatured(
  ctx: CanvasRenderingContext2D,
  sans: string,
  person: SpeakerLineupPerson,
  photo: HTMLImageElement | null,
  y: number,
  label: string,
) {
  const cx = 230;
  const cy = y + 96;
  drawPortrait(ctx, photo, cx, cy, 88, person.name);
  const x = 360;
  let textY = y + 36;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#D9FFE8";
  ctx.font = `600 26px ${sans}`;
  ctx.fillText(label, x, textY);
  textY += 36;
  const name = fitLines(ctx, cardName(person), 640, `600 36px ${sans}`, 22, 2);
  ctx.fillStyle = "#FFFFFF";
  for (const line of name) {
    ctx.font = `600 ${line.size}px ${sans}`;
    ctx.fillText(line.text, x, textY);
    textY += line.size + 4;
  }
  if (person.organization) {
    textY += 6;
    const org = fitLines(ctx, person.organization, 640, `600 22px ${sans}`, 16, 2);
    ctx.fillStyle = "rgba(255,255,255,0.84)";
    for (const line of org) {
      ctx.font = `600 ${line.size}px ${sans}`;
      ctx.fillText(line.text, x, textY);
      textY += line.size + 3;
    }
  }
}

function drawPortrait(ctx: CanvasRenderingContext2D, photo: HTMLImageElement | null, x: number, y: number, radius: number, name: string) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius + 14, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(210, 255, 236, 0.35)";
  ctx.lineWidth = 10;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.92)";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.clip();
  if (photo) {
    const scale = Math.max((radius * 2) / photo.width, (radius * 2) / photo.height);
    const w = photo.width * scale;
    const h = photo.height * scale;
    ctx.drawImage(photo, x - w / 2, y - h / 2, w, h);
  } else {
    ctx.fillStyle = "#0C4A45";
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `600 ${Math.round(radius * 0.55)}px "Segoe UI", sans-serif`;
    ctx.fillText(initials(name), x, y);
  }
  ctx.restore();
}

function shortDate(iso: string, english: boolean) {
  const parsed = new Date(`${iso}T12:00:00`);
  if (!iso || Number.isNaN(parsed.getTime())) return english ? "9–20 November" : "9–20 Kasım";
  return parsed.toLocaleDateString(english ? "en-GB" : "tr-TR", { day: "numeric", month: "long" });
}

function clockLabel(session: SpeakerSession | null) {
  return [session?.startTime, session?.endTime].filter(Boolean).join(" – ");
}

function placeLabel(location: string, english: boolean) {
  const fold = location.toLocaleLowerCase("tr-TR");
  if (!location.trim() || fold.includes("ana sahne")) return english ? "Health Pavilion" : "Sağlık Bakanlığı Pavilyonu";
  return location;
}

function badgeLabel(kind: string, english: boolean) {
  if (kind === "sunum") return english ? "TALK" : "SUNUM";
  if (kind === "acilis") return english ? "OPENING" : "AÇILIŞ";
  return "PANEL";
}

function roleLabel(person: SpeakerLineupPerson, number: number, english: boolean) {
  if (person.role === "moderator") return english ? "Moderator" : "Moderatör";
  if (person.role === "acilis") return english ? "Opening" : "Açılış";
  if (person.role === "kapanis") return english ? "Close" : "Kapanış";
  return english ? `Speaker ${number}` : `Konuşmacı ${number}`;
}

function cardName(person: SpeakerLineupPerson) {
  const title = person.title.trim();
  const name = person.name.trim();
  if (!title) return name;
  const bare = title.replace(/\./g, "").toLocaleLowerCase("tr-TR");
  if (bare && name.toLocaleLowerCase("tr-TR").includes(bare)) return name;
  return `${title} ${name}`.replace(/\s+/g, " ");
}

function initials(name: string) {
  const words = name.replace(/^(prof|doç|doc|dr|uzm)\.?\s+/gi, "").split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] || "") + (words[1]?.[0] || "")).toLocaleUpperCase("tr-TR");
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
