"use client";

import { useState } from "react";
import { PrizeWheel, useWheelMotion, WheelSpinButtons } from "@/components/game/PrizeWheel";
import { PrizePass } from "@/components/game/PrizePass";
import { SAMPLE_WHEEL, type WheelMotion } from "@/lib/wheel";
import { useI18n } from "@/components/I18nProvider";

type Claim = {
  used: boolean;
  id: string;
  index: number;
  label: string;
  land: number;
  fullName: string;
  eventTitle: string;
  passPath: string;
};

export function OnceWheel({
  agendaId = "",
  email,
  deviceToken,
  gameSlug = "",
  personName = "",
  eventTitle = "",
  onClose,
}: {
  agendaId?: string;
  email?: string;
  deviceToken?: string;
  gameSlug?: string;
  personName?: string;
  eventTitle?: string;
  onClose?: () => void;
}) {
  const { tx } = useI18n();
  const [motion, setMotion] = useState<WheelMotion>({ mode: "idle", from: 0, target: 0, startedAt: null, seconds: 7 });
  const [result, setResult] = useState("");
  const [ticket, setTicket] = useState<Claim | null>(null);
  const [highlight, setHighlight] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const angle = useWheelMotion(motion);
  const slices = SAMPLE_WHEEL.slices.filter((slice) => slice.kind !== "again").map((slice) => ({
    label: slice.label,
    color: slice.color,
    kind: slice.kind,
    weight: slice.weight,
  }));

  async function claim() {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (gameSlug) {
      const token = localStorage.getItem("cop31-device") || "";
      if (token) headers["x-cop31-device"] = token;
      const res = await fetch(`/api/public/games/${gameSlug}/prize`, { method: "POST", headers });
      const data = (await res.json().catch(() => ({}))) as Claim & { error?: string };
      if (!res.ok) throw new Error(data.error || "Çark açılamadı");
      return data;
    }
    if (deviceToken) headers["x-cop31-device"] = deviceToken;
    const res = await fetch(deviceToken ? "/api/app/wheel" : "/api/public/join-wheel", {
      method: "POST",
      headers,
      body: JSON.stringify(deviceToken ? { agendaId } : { refId: agendaId, email, fullName: personName }),
    });
    const data = (await res.json().catch(() => ({}))) as Claim & { error?: string };
    if (!res.ok) throw new Error(data.error || "Çark açılamadı");
    return data;
  }

  function show(data: Claim, animate: boolean) {
    if (animate) {
      setHighlight(null);
      setMotion({ mode: "stop", from: 0, target: data.land, startedAt: new Date().toISOString(), seconds: 7 });
      window.setTimeout(() => {
        setMotion({ mode: "idle", from: data.land, target: data.land, startedAt: null, seconds: 7 });
        setHighlight(data.index);
        setResult(data.label);
        setTicket(data);
      }, 9200);
      return;
    }
    setHighlight(data.index);
    setMotion({ mode: "idle", from: data.land, target: data.land, startedAt: null, seconds: 7 });
    setResult(data.label);
    setTicket(data);
  }

  async function spin() {
    setBusy(true);
    setError("");
    try {
      const data = await claim();
      show(data, !data.used);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Çark açılamadı");
    } finally {
      setBusy(false);
    }
  }

  const ticketName = ticket?.fullName || personName;
  const ticketEvent = ticket?.eventTitle || eventTitle;

  return (
    <div className="card p-4 space-y-3">
      <p className="text-xs tracking-[0.16em] uppercase text-[#0077C2]">{tx("Tek seferlik")}</p>
      <h2 className="display text-3xl">{tx("Çark hakkı")}</h2>
      <p className="text-sm text-[#3E6A88]">{tx("Bu etkinlik için çark bir kez döner. Sonuç kaydolur, yeniden çevrilmez.")}</p>
      <div className="flex justify-center">
        <PrizeWheel slices={slices} angle={angle} size={280} highlight={highlight} mode={motion.mode} />
      </div>
      {result ? <p className="text-center font-semibold text-[#0077C2]">{tx(result)}</p> : (
        <WheelSpinButtons mode={motion.mode} busy={busy} canSpin={!result} canStop={false} onSpin={() => void spin()} onStop={() => undefined} />
      )}
      {ticket ? <PrizePass name={ticketName} eventTitle={ticketEvent} prize={result} passPath={ticket.passPath} /> : null}
      {error ? <p className="text-sm text-[#E31C23]">{tx(error) === error ? error : tx(error)}</p> : null}
      {onClose ? (
        <button className="btn ghost w-full justify-center" type="button" onClick={onClose}>{tx("Kapat")}</button>
      ) : null}
    </div>
  );
}
