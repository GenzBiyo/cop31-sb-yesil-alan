"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HATIRA_FRAME, HATIRA_NATURE, defaultHatiraLogos, type HatiraLogos, type HatiraPublic } from "@/lib/hatira";
import { cutoutPerson, warmupSegmenter } from "@/lib/hatira-segment";
import { useI18n } from "@/components/I18nProvider";

const W = 900;
const H = 1200;
const WIN = { x: 0.135, y: 0.172, w: 0.73, h: 0.655 };

type Step = "live" | "shot" | "ready" | "sent";

export function HatiraPlay({ slug, logos }: { slug: string; logos?: HatiraLogos | null }) {
  const { tx } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<HTMLImageElement | null>(null);
  const natureRef = useRef<HTMLImageElement | null>(null);
  const copRef = useRef<HTMLImageElement | null>(null);
  const saglikRef = useRef<HTMLImageElement | null>(null);
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
    const frame = new Image();
    frame.src = HATIRA_FRAME;
    frameRef.current = frame;
    const nature = new Image();
    nature.src = HATIRA_NATURE;
    natureRef.current = nature;
    const cop = new Image();
    cop.src = marks.cop31;
    copRef.current = cop;
    const saglik = new Image();
    saglik.src = marks.saglik;
    saglikRef.current = saglik;
    warmupSegmenter();
  }, [marks.cop31, marks.saglik]);

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
      const frame = frameRef.current && frameRef.current.complete ? frameRef.current : await loadImg(HATIRA_FRAME);
      const nature = natureRef.current && natureRef.current.complete ? natureRef.current : await loadImg(HATIRA_NATURE);
      const cop = copRef.current && copRef.current.complete ? copRef.current : await loadImg(marks.cop31);
      const saglik = saglikRef.current && saglikRef.current.complete ? saglikRef.current : await loadImg(marks.saglik);
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(frame, 0, 0, W, H);
      const rx = WIN.x * W;
      const ry = WIN.y * H;
      const rw = WIN.w * W;
      const rh = WIN.h * H;
      ctx.save();
      roundRect(ctx, rx, ry, rw, rh, 18);
      ctx.clip();
      cover(ctx, nature, rx, ry, rw, rh);
      stand(ctx, person, rx, ry, rw, rh);
      ctx.restore();
      paintBanner(ctx, cop, saglik);
      ctx.strokeStyle = "rgba(43, 168, 196, 0.85)";
      ctx.lineWidth = 8;
      roundRect(ctx, rx, ry, rw, rh, 18);
      ctx.stroke();
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
            <div className="hatira-cam-empty">
              <p>{tx("Ön kamerayı açın")}</p>
              <span>{tx("Karekod HTTP üzerindenyse tarayıcı canlı kamerayı kilitleyebilir. Telefonun kendi ön kamerasını kullanın.")}</span>
            </div>
          ) : null}
        </div>
      ) : null}
      {step === "ready" ? (
        <div className="hatira-stage is-frame">
          <img src={composed} alt="Hatıra" className="hatira-cam" />
        </div>
      ) : null}
      {step === "sent" ? (
        <div className="card p-5 text-center space-y-3">
          {composed ? <img src={composed} alt="Gönderilen hatıra" className="mx-auto max-w-full" /> : null}
          <h2 className="display text-4xl">{tx("Teşekkür ederiz")}</h2>
          <p className="text-sm text-[#57534e]">{tx("Admin onaylarsa hatıran pavilion duvarında görünür.")}</p>
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

export function HatiraWallView({ hatira }: { hatira: HatiraPublic | null }) {
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
        <p className="text-xs tracking-[0.2em] uppercase opacity-70">COP31 Türkiye</p>
        <h2 className="display text-5xl mt-2">{tx("Hatıra")}</h2>
        <p className="mt-3 text-[#C8EEFA]">{tx("Karekodu okutun, selfie çekin. Admin onaylayınca burada görünürsünüz.")}</p>
      </div>
    );
  }

  return (
    <div className="hatira-wall">
      <img src={current.photoPath} alt="Hatıra" />
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

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
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
  const scale = Math.min(w / iw, (h * 0.92) / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = x + (w - dw) / 2;
  const dy = y + h - dh;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function paintBanner(ctx: CanvasRenderingContext2D, cop: HTMLImageElement, saglik: HTMLImageElement) {
  const y = H * 0.835;
  const band = H * 0.145;
  ctx.fillStyle = "rgba(10, 42, 92, 0.92)";
  ctx.fillRect(W * 0.13, y, W * 0.74, band);
  drawLogo(ctx, cop, W * 0.145, y + 10, 210, 72, false);
  drawLogo(ctx, saglik, W * 0.72, y + 6, 86, 86, true);
  ctx.textAlign = "center";
  ctx.fillStyle = "#EEF8FD";
  ctx.font = "600 22px Georgia, serif";
  ctx.fillText("COP31 Türkiye Sağlık Bakanlığı Hatırası", W / 2, y + 108);
  ctx.font = "500 15px sans-serif";
  ctx.fillStyle = "#b8e4ef";
  ctx.fillText("COP31 Türkiye Ministry of Health Souvenir  ·  Antalya 2026", W / 2, y + 132);
}

function drawLogo(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  maxW: number,
  maxH: number,
  punchBlack: boolean,
) {
  const scale = Math.min(maxW / img.width, maxH / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  if (!punchBlack) {
    ctx.drawImage(img, x, y, dw, dh);
    return;
  }
  const tmp = document.createElement("canvas");
  tmp.width = img.width;
  tmp.height = img.height;
  const t = tmp.getContext("2d");
  if (!t) return;
  t.drawImage(img, 0, 0);
  const data = t.getImageData(0, 0, tmp.width, tmp.height);
  for (let i = 0; i < data.data.length; i += 4) {
    if (data.data[i] < 40 && data.data[i + 1] < 40 && data.data[i + 2] < 40) data.data[i + 3] = 0;
  }
  t.putImageData(data, 0, 0);
  ctx.drawImage(tmp, x, y, dw, dh);
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
