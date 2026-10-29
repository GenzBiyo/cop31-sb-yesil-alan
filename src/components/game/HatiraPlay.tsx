"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HATIRA_H, HATIRA_W, defaultHatiraLogos, type HatiraLogos, type HatiraPublic } from "@/lib/hatira";
import { cutoutPerson, warmupSegmenter } from "@/lib/hatira-segment";
import { useI18n, Tx } from "@/components/I18nProvider";
import { ShareBar } from "@/components/game/ShareBar";

const W = HATIRA_W;
const H = HATIRA_H;

type Step = "live" | "shot" | "ready" | "sent";

export function HatiraPlay({ slug, logos, onSent }: { slug: string; logos?: HatiraLogos | null; onSent?: () => void }) {
  const { tx } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const natureRef = useRef<HTMLImageElement | null>(null);
  const marks = logos || defaultHatiraLogos();
  const [step, setStep] = useState<Step>("live");
  const [shot, setShot] = useState<string>("");
  const [composed, setComposed] = useState<string>("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(false);
  const [camReady, setCamReady] = useState(false);

  const stopCam = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setLive(false);
    setCamReady(false);
  }, []);

  const startCam = useCallback(async () => {
    if (!canLiveCam()) {
      setMsg("Bu bağlantıda canlı kamera kapalı. Aşağıdan ön kamerayla selfie çekin.");
      return;
    }
    stopCam();
    const video = videoRef.current;
    if (!video) {
      setMsg("Kamera alanı hazır değil, tekrar deneyin.");
      return;
    }
    video.setAttribute("playsinline", "true");
    video.setAttribute("webkit-playsinline", "true");
    const tries: MediaStreamConstraints[] = [
      { audio: false, video: { facingMode: { ideal: "user" } } },
      { audio: false, video: { facingMode: "user" } },
      { audio: false, video: true },
    ];
    let last = "Kamera açılamadı";
    for (const constraints of tries) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        video.srcObject = stream;
        await video.play().catch(() => undefined);
        setLive(true);
        setMsg("");
        return;
      } catch (e) {
        last = e instanceof Error ? e.message : last;
      }
    }
    setMsg("Ön kamera açılamadı. Aşağıdaki düğmeyle telefon kamerasını kullanın.");
    console.warn(last);
  }, [stopCam]);

  useEffect(() => {
    const nature = new Image();
    nature.src = marks.background;
    natureRef.current = nature;
    warmupSegmenter();
  }, [marks.background]);

  useEffect(() => {
    if (step !== "live") {
      stopCam();
      return;
    }
    if (canLiveCam()) void startCam();
    else setMsg("Ön kamerayı açmak için aşağıdaki düğmeye dokunun.");
    return () => stopCam();
  }, [step, startCam, stopCam]);

  function grab() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      setMsg("Kamera henüz hazır değil. Ön kamerayla çek düğmesini kullanın.");
      return;
    }
    const c = document.createElement("canvas");
    c.width = video.videoWidth;
    c.height = video.videoHeight;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.translate(c.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    setShot(c.toDataURL("image/jpeg", 0.92));
    setStep("shot");
  }

  async function fromFile(file: File) {
    setMsg("");
    try {
      setShot(await fileToJpeg(file));
      setStep("shot");
    } catch {
      setMsg("Fotoğraf okunamadı, tekrar deneyin.");
    }
  }

  async function prepare() {
    if (!shot) return;
    setBusy(true);
    setMsg("Arka plan temizleniyor, gerçek Antalya fonu hazırlanıyor…");
    try {
      const face = await loadImg(shot);
      const person = await cutoutPerson(face, slug);
      const nature = natureRef.current && natureRef.current.complete ? natureRef.current : await loadImg(marks.background);
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      paintCard(ctx, nature, person);
      setComposed(c.toDataURL("image/jpeg", 0.9));
      setStep("ready");
      setMsg("");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Hazırlanamadı");
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    if (!composed) return;
    setBusy(true);
    setMsg("");
    try {
      const blob = await (await fetch(composed)).blob();
      const form = new FormData();
      form.append("photo", blob, "hatira.jpg");
      const res = await fetch(`/api/public/games/${slug}/hatira`, { method: "POST", body: form });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Gönderilemedi");
      setStep("sent");
      onSent?.();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Gönderilemedi");
    } finally {
      setBusy(false);
    }
  }

  function retake() {
    setShot("");
    setComposed("");
    setMsg("");
    setStep("live");
  }

  return (
    <div className="space-y-3">
      {step === "live" || step === "shot" ? (
        <div className="hatira-stage">
          {step === "live" ? (
            <video
              ref={videoRef}
              className={`hatira-cam is-mirror ${live ? "" : "is-idle"}`}
              playsInline
              muted
              autoPlay
              onLoadedMetadata={() => setCamReady(true)}
            />
          ) : (
            <img src={shot} alt="Selfie" className="hatira-cam" />
          )}
          {step === "live" && !live ? (
            <div className="hatira-cam-empty" style={{ backgroundImage: `linear-gradient(180deg, rgba(7,22,40,0.28), rgba(0,119,194,0.42)), url("${marks.background}")` }}>
              <p>{tx("Ön kamerayı açın")}</p>
              <span>{tx("Karekod HTTP üzerindenyse tarayıcı canlı kamerayı kilitleyebilir. Telefonun kendi ön kamerasını kullanın.")}</span>
            </div>
          ) : null}
        </div>
      ) : null}
      {step === "ready" ? (
        <div className="hatira-stage is-frame">
          <img src={composed} alt={tx("Hatıra")} className="hatira-cam" />
          <ShareBar text="COP31 Sağlık Pavilionu hatıram." image={composed} />
        </div>
      ) : null}
      {step === "sent" ? (
        <div className="card p-5 text-center space-y-3">
          {composed ? <img src={composed} alt={tx("Gönderilen hatıra")} className="mx-auto max-w-full" /> : null}
          <h2 className="display text-4xl">{tx("Teşekkür ederiz")}</h2>
          <p className="text-sm text-[#57534e]">{tx("Admin onaylarsa hatıran pavilion duvarında görünür.")}</p>
          <ShareBar text="COP31 Sağlık Pavilionu hatıram." image={composed} />
          <button className="btn ghost" type="button" onClick={retake}>{tx("Yeniden çek")}</button>
        </div>
      ) : null}

      {msg ? <p className="text-sm text-[#0077C2]">{tx(msg)}</p> : null}

      {step === "live" ? (
        <div className="space-y-2">
          <label className="btn w-full justify-center">
            {tx("Ön kamerayla çek")}
            <input
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void fromFile(file);
              }}
            />
          </label>
          {live && camReady ? (
            <button className="btn ghost w-full justify-center" type="button" onClick={grab}>{tx("Canlı görüntüden çek")}</button>
          ) : (
            <button className="btn ghost w-full justify-center" type="button" onClick={() => void startCam()}>
              {tx("Canlı önizlemeyi dene")}
            </button>
          )}
          <label className="btn ghost w-full justify-center">
            {tx("Galeriden seç")}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void fromFile(file);
              }}
            />
          </label>
        </div>
      ) : null}
      {step === "shot" ? (
        <div className="grid grid-cols-2 gap-2">
          <button className="btn ghost" type="button" onClick={retake}>{tx("Yeniden çek")}</button>
          <button className="btn" type="button" disabled={busy} onClick={() => void prepare()}>{busy ? tx("Hazırlanıyor…") : tx("Hazırla")}</button>
        </div>
      ) : null}
      {step === "ready" ? (
        <div className="grid grid-cols-2 gap-2">
          <button className="btn ghost" type="button" onClick={retake}>{tx("Yeniden çek")}</button>
          <button className="btn" type="button" disabled={busy} onClick={() => void send()}>{busy ? tx("Gönderiliyor…") : tx("Gönder")}</button>
        </div>
      ) : null}
    </div>
  );
}

export function HatiraWallView({ hatira, background }: { hatira: HatiraPublic | null; background?: string }) {
  const { tx } = useI18n();
  const shots = hatira?.shots || [];
  const [i, setI] = useState(0);
  useEffect(() => {
    if (shots.length < 2) return;
    const t = setInterval(() => setI((n) => (n + 1) % shots.length), 7000);
    return () => clearInterval(t);
  }, [shots.length]);
  const current = shots[i] || shots[0];

  if (!current) {
    return (
      <div className="hatira-wall is-empty">
        {background ? <img src={background} alt="" /> : null}
        <p className="text-xs tracking-[0.2em] uppercase opacity-70 mt-4"><Tx>COP31 Türkiye</Tx></p>
        <h2 className="display text-5xl mt-2">{tx("Hatıra")}</h2>
        <p className="mt-3 text-[#C8EEFA]">{tx("Karekodu okutun, selfie çekin. Admin onaylayınca burada görünürsünüz.")}</p>
      </div>
    );
  }

  return (
    <div className="hatira-wall">
      <img src={current.photoPath} alt={tx("Hatıra")} />
      <div className="display hatira-thanks">{tx("Teşekkür ederiz")}</div>
      {shots.length > 1 ? (
        <div className="hatira-strip">
          {shots.slice(0, 8).map((s, idx) => (
            <img key={s.id} src={s.photoPath} alt="" className={idx === i ? "is-on" : ""} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function canLiveCam() {
  return typeof window !== "undefined" && window.isSecureContext && Boolean(navigator.mediaDevices?.getUserMedia);
}

function cover(ctx: CanvasRenderingContext2D, img: CanvasImageSource, x: number, y: number, w: number, h: number) {
  const iw = "width" in img ? Number(img.width) : 0;
  const ih = "height" in img ? Number(img.height) : 0;
  if (!iw || !ih) return;
  const ir = iw / ih;
  const wr = w / h;
  let dw = w;
  let dh = h;
  let dx = x;
  let dy = y;
  if (ir > wr) {
    dw = h * ir;
    dx = x - (dw - w) / 2;
  } else {
    dh = w / ir;
    dy = y - (dh - h) / 2;
  }
  ctx.drawImage(img, dx, dy, dw, dh);
}

function stand(ctx: CanvasRenderingContext2D, img: CanvasImageSource, x: number, y: number, w: number, h: number) {
  const iw = "width" in img ? Number(img.width) : 0;
  const ih = "height" in img ? Number(img.height) : 0;
  if (!iw || !ih) return;
  let scale = h / ih;
  if (iw * scale > w * 0.96) scale = (w * 0.96) / iw;
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = x + (w - dw) / 2;
  const dy = y + h - dh;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function isCutout(img: CanvasImageSource) {
  const probe = document.createElement("canvas");
  probe.width = 16;
  probe.height = 16;
  const g = probe.getContext("2d", { willReadFrequently: true });
  if (!g) return false;
  g.drawImage(img, 0, 0, 16, 16);
  const px = g.getImageData(0, 0, 16, 16).data;
  const corners = [0, 15, 15 * 16, 16 * 16 - 1];
  let clear = 0;
  for (const i of corners) if (px[i * 4 + 3] < 48) clear += 1;
  return clear >= 2;
}

function paintCard(ctx: CanvasRenderingContext2D, nature: CanvasImageSource, person: CanvasImageSource) {
  cover(ctx, nature, 0, 0, W, H);
  const pw = W * 0.5;
  const ph = H * 0.5;
  const px = (W - pw) / 2;
  const py = H - ph;
  ctx.save();
  ctx.beginPath();
  ctx.rect(px, py, pw, ph);
  ctx.clip();
  if (isCutout(person)) stand(ctx, person, px, py, pw, ph);
  else cover(ctx, person, px, py, pw, ph);
  ctx.restore();
  ctx.textAlign = "center";
  ctx.fillStyle = "#FFFFFF";
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 12;
  ctx.font = "700 36px Georgia, serif";
  ctx.fillText("COP31 Türkiye", W / 2, H * 0.16);
  ctx.font = "600 22px Segoe UI, sans-serif";
  ctx.fillText("Antalya  ·  9–20 Kasım 2026", W / 2, H * 0.16 + 40);
  ctx.shadowBlur = 0;
}

async function fileToJpeg(file: File) {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    const c = document.createElement("canvas");
    c.width = bmp.width;
    c.height = bmp.height;
    c.getContext("2d")?.drawImage(bmp, 0, 0);
    bmp.close();
    return c.toDataURL("image/jpeg", 0.92);
  } catch {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("okunamadı"));
      reader.readAsDataURL(file);
    });
  }
}

function loadImg(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Görsel yüklenemedi"));
    img.src = src;
  });
}
