"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useI18n } from "@/components/I18nProvider";

type View = {
  state: "login" | "give" | "thanks";
  fullName: string;
  eventTitle: string;
  label: string;
};

function spinIdFrom(text: string) {
  const raw = text.trim();
  const match = raw.match(/\/hediye\/p\/([a-z0-9]+)/i);
  if (match) return match[1];
  if (/^c[a-z0-9]{8,}$/i.test(raw)) return raw;
  return "";
}

export function PrizeScanner() {
  const { tx } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const seen = useRef("");
  const lastAt = useRef(0);
  const [view, setView] = useState<View | null>(null);
  const [error, setError] = useState("");
  const [cam, setCam] = useState("");
  const [manual, setManual] = useState("");

  async function redeem(id: string) {
    if (!id) return;
    const now = Date.now();
    if (id === seen.current && now - lastAt.current < 1200) return;
    seen.current = id;
    lastAt.current = now;
    setError("");
    const res = await fetch("/api/ambassador/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = (await res.json().catch(() => ({}))) as View & { error?: string };
    if (!res.ok) {
      seen.current = "";
      setError(data.error || "Kod okunamadı");
      return;
    }
    setView(data);
  }

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let stop = false;
    let controls: { stop: () => void } | null = null;
    void (async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        controls = await reader.decodeFromVideoDevice(undefined, video, (result) => {
          if (stop || !result) return;
          const id = spinIdFrom(result.getText());
          if (id) void redeem(id);
        });
      } catch {
        if (!stop) setCam("Kamera açılamadı. Kodu aşağıya yapıştırın.");
      }
    })();
    return () => {
      stop = true;
      controls?.stop();
    };
  }, []);

  function onManual(e: FormEvent) {
    e.preventDefault();
    const id = spinIdFrom(manual);
    if (!id) {
      setError("Kod bulunamadı");
      return;
    }
    seen.current = "";
    void redeem(id);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#3E6A88]">{tx("Karekodu kamerayla okutun.")}</p>
      <video ref={videoRef} className="w-full rounded-xl bg-black" muted playsInline />
      {cam ? <p className="text-sm">{tx(cam)}</p> : null}
      <form onSubmit={onManual} className="space-y-2">
        <input className="field" value={manual} onChange={(e) => setManual(e.target.value)} placeholder={tx("Kodu okutun")} />
        <button className="btn w-full justify-center" type="submit">{tx("Kodu okutun")}</button>
      </form>
      {error ? <p className="text-sm text-[#0077C2]">{tx(error)}</p> : null}
      {view?.state === "give" ? (
        <div className="card p-4 text-center space-y-2">
          <p className="text-xs tracking-[0.16em] uppercase text-[#0077C2]">{tx("Hediyeyi verin.")}</p>
          <h2 className="display text-3xl">{view.fullName}</h2>
          <p>{view.eventTitle}</p>
          <p className="font-semibold text-[#0077C2]">{tx(view.label)}</p>
        </div>
      ) : null}
      {view?.state === "thanks" ? (
        <div className="card p-4 text-center space-y-2">
          <h2 className="display text-3xl">{tx("Teşekkürler")}</h2>
          <p>{view.fullName}</p>
          <p className="font-semibold">{tx("Bu hediye teslim edildi.")}</p>
        </div>
      ) : null}
    </div>
  );
}
