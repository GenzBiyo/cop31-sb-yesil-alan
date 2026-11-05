"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { speakerCardFileName, speakerShareCaption, SPEAKER_CARD_TAGS, type SpeakerLineupPerson, type SpeakerSession, type SpeakerShare } from "@/lib/speaker-share";
import { useI18n } from "@/components/I18nProvider";

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
          <div className="aspect-[819/1024] border border-[#B5DFF2] bg-white grid place-items-center text-sm text-[#3E6A88]">
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

const BASE_W = 819;
const BASE_H = 1024;
const PORTRAITS = [
  { x: 147, y: 604, r: 50 },
  { x: 324, y: 602, r: 48 },
  { x: 448, y: 604, r: 50 },
  { x: 576, y: 604, r: 50 },
  { x: 706, y: 602, r: 48 },
];

async function paintCard(speaker: SpeakerShare, session: SpeakerSession | null, english: boolean) {
  await document.fonts?.ready;
  const fonts = fontStacks();
  const pack = await fetch("/api/public/card-backgrounds").then((res) => res.json()).catch(() => null);
  const template = await loadImage(pack?.slots?.["speaker-tr"]?.url || "/brand/panel-afis.jpg");
  if (!template) throw new Error("template");
  const canvas = document.createElement("canvas");
  const scale = template.width < 1200 ? 2 : 1;
  canvas.width = template.width * scale;
  canvas.height = template.height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(template, 0, 0, canvas.width, canvas.height);
  const sx = canvas.width / BASE_W;
  const sy = canvas.height / BASE_H;
  const X = (n: number) => Math.round(n * sx);
  const Y = (n: number) => Math.round(n * sy);
  const people = (session?.lineup.length
    ? session.lineup
    : [{
        name: speaker.name,
        role: "panelist",
        title: speaker.title,
        organization: speaker.organization,
        photoPath: speaker.photoPath,
      }]).slice(0, 5);
  const photos = await Promise.all(people.map((person) => (person.photoPath ? loadImage(person.photoPath) : Promise.resolve(null))));
  const title = session?.title || (english ? "Health Pavilion" : "Sağlık Pavyonu");
  const titleLines = fitLines(ctx, title, X(400), `600 ${X(42)}px ${fonts.sans}`, X(22), 2);
  let y = Y(176);
  titleLines.forEach((line, index) => {
    ctx.fillStyle = index === titleLines.length - 1 ? "#178A45" : "#123C46";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = `600 ${line.size}px ${fonts.sans}`;
    ctx.fillText(line.text, X(36), y);
    y += line.size + Y(4);
  });
  if (session?.theme) {
    const theme = fitLines(ctx, session.theme, X(420), `600 ${X(18)}px ${fonts.sans}`, X(13), 2);
    y = Math.max(y + Y(8), Y(292));
    ctx.fillStyle = "#1A3A44";
    for (const line of theme) {
      ctx.font = `600 ${line.size}px ${fonts.sans}`;
      ctx.fillText(line.text, X(36), y);
      y += line.size + Y(2);
    }
  }
  const body = fitLines(ctx, inviteCopy(session, title), X(420), `600 ${X(15)}px ${fonts.sans}`, X(12), 3);
  y = Math.max(y + Y(8), Y(338));
  ctx.fillStyle = "#4E6570";
  for (const line of body) {
    ctx.font = `600 ${line.size}px ${fonts.sans}`;
    ctx.fillText(line.text, X(36), y);
    y += line.size + Y(2);
  }
  const when = sessionDate(session?.date || "");
  ctx.fillStyle = "#0E7A64";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = `600 ${X(16)}px ${fonts.sans}`;
  ctx.fillText(when.top, X(118), Y(438));
  ctx.font = `600 ${X(13)}px ${fonts.sans}`;
  ctx.fillText(when.sub, X(118), Y(460));
  ctx.font = `600 ${X(18)}px ${fonts.sans}`;
  ctx.fillText(clockLabel(session), X(378), Y(448));
  const place = fitLines(ctx, placeLabel(session?.location || ""), X(200), `600 ${X(16)}px ${fonts.sans}`, X(12), 2);
  let py = Y(448) - ((place.length - 1) * (place[0].size + Y(2))) / 2;
  for (const line of place) {
    ctx.font = `600 ${line.size}px ${fonts.sans}`;
    ctx.fillText(line.text, X(560), py);
    py += line.size + Y(2);
  }
  people.forEach((person, index) => {
    const slot = PORTRAITS[index];
    drawSlotPhoto(ctx, photos[index], X(slot.x), Y(slot.y), X(slot.r), person.name, fonts.sans);
    let ny = Y(slot.y + slot.r + 16);
    const name = fitLines(ctx, cardName(person), X(148), `600 ${X(15)}px ${fonts.sans}`, X(11), 2);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#10283A";
    for (const line of name) {
      ctx.font = `600 ${line.size}px ${fonts.sans}`;
      ctx.fillText(line.text, X(slot.x), ny);
      ny += line.size + Y(1);
    }
    if (person.organization) {
      const org = fitLines(ctx, person.organization, X(150), `600 ${X(11)}px ${fonts.sans}`, X(9), 3);
      ctx.fillStyle = "#5C7380";
      for (const line of org) {
        ctx.font = `600 ${line.size}px ${fonts.sans}`;
        ctx.fillText(line.text, X(slot.x), ny);
        ny += line.size + Y(1);
      }
    }
  });
  ctx.fillStyle = "#0E7A64";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = `600 ${X(16)}px ${fonts.sans}`;
  ctx.fillText(when.short, X(92), Y(956));
  ctx.fillText(clockLabel(session), X(236), Y(956));
  const bottomPlace = fitLines(ctx, placeLabel(session?.location || ""), X(170), `600 ${X(15)}px ${fonts.sans}`, X(11), 1);
  ctx.font = `600 ${bottomPlace[0].size}px ${fonts.sans}`;
  ctx.fillText(bottomPlace[0].text, X(392), Y(956));
  return canvas.toDataURL("image/jpeg", 0.92);
}

function inviteCopy(session: SpeakerSession | null, title: string) {
  const summary = session?.summary?.replace(/\s+/g, " ").trim();
  if (summary) return summary.slice(0, 220);
  return `COP31 Antalya kapsamında düzenlenen “${title}” oturumuna davetlisiniz.`;
}

function sessionDate(iso: string) {
  const parsed = new Date(`${iso}T12:00:00`);
  if (!iso || Number.isNaN(parsed.getTime())) {
    return { top: "9–20 November 2026", sub: "(Kasım)", short: "9–20 Kasım" };
  }
  const week = parsed.toLocaleDateString("en-GB", { weekday: "short" });
  const rest = parsed.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  return {
    top: `${week}, ${rest}`,
    sub: `(${parsed.toLocaleDateString("tr-TR", { weekday: "long" })})`,
    short: parsed.toLocaleDateString("tr-TR", { day: "numeric", month: "long" }),
  };
}

function drawSlotPhoto(
  ctx: CanvasRenderingContext2D,
  photo: HTMLImageElement | null,
  x: number,
  y: number,
  radius: number,
  name: string,
  sans: string,
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.clip();
  if (photo) {
    const scale = Math.max((radius * 2) / photo.width, (radius * 2) / photo.height);
    const w = photo.width * scale;
    const h = photo.height * scale;
    ctx.drawImage(photo, x - w / 2, y - h / 2, w, h);
  } else {
    ctx.fillStyle = "#E7F6F2";
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    ctx.fillStyle = "#0E7A64";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `600 ${Math.round(radius * 0.46)}px ${sans}`;
    ctx.fillText(initials(name), x, y);
  }
  ctx.restore();
}


function clockLabel(session: SpeakerSession | null) {
  return [session?.startTime, session?.endTime].filter(Boolean).join(" – ");
}

function placeLabel(location: string) {
  const fold = location.toLocaleLowerCase("tr-TR");
  if (!location.trim() || fold.includes("ana sahne")) return "Sağlık Bakanlığı Pavyonu";
  return location;
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
