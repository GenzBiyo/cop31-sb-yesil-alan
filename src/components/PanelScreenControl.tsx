"use client";

import { useState } from "react";
import { MonitorPlay } from "lucide-react";
import { api, useApi } from "@/lib/client";
import { useI18n } from "@/components/I18nProvider";

type ScreenState = {
  setting: { mode: "auto" | "panel" | "off"; panelId: string };
  live: { id: string; title: string } | null;
};
type PanelRow = { id: string; title: string; date: string; startTime: string; status: string };

/** Lets admin/SB staff decide what the pavilion display (/ekran) shows. */
export function PanelScreenControl() {
  const { tx } = useI18n();
  const { data, reload, error } = useApi<ScreenState>("/api/panel-screen");
  const { data: panels } = useApi<{ panels: PanelRow[] }>("/api/panels");
  const [msg, setMsg] = useState("");
  if (error || !data) return null;

  const value = data.setting.mode === "panel" ? `panel:${data.setting.panelId}` : data.setting.mode;
  const rows = [...(panels?.panels || [])].sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));

  async function change(next: string) {
    setMsg("");
    const [mode, panelId] = next.split(":");
    try {
      await api("/api/panel-screen", { method: "POST", body: JSON.stringify({ mode, panelId }) });
      await reload();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : tx("Kaydedilemedi"));
    }
  }

  return (
    <section className="card p-4 flex flex-wrap items-center gap-3">
      <MonitorPlay size={22} className="text-[#00796B]" />
      <div className="flex-1 min-w-[14rem]">
        <h2 className="font-semibold">{tx("Pavilyon ekranı")}</h2>
        <p className="text-sm text-[#57534e]">
          {data.live
            ? `${tx("Şu an ekranda")}: ${data.live.title}`
            : tx("Şu an ekranda ana sayfa görünümü var.")}{" "}
          {tx("Otomatik modda panel, başlangıçtan 10 dakika önce ekrana gelir ve bitince kalkar.")}
        </p>
        {msg ? <p className="text-sm text-[#c2410c]">{msg}</p> : null}
      </div>
      <select className="input max-w-[22rem]" value={value} onChange={(e) => void change(e.target.value)}>
        <option value="auto">{tx("Otomatik (takvime göre)")}</option>
        <option value="off">{tx("Kapalı · ana sayfa görünümü")}</option>
        {rows.map((p) => (
          <option key={p.id} value={`panel:${p.id}`}>
            {p.date.slice(8, 10)}.{p.date.slice(5, 7)} {p.startTime} · {p.title}
          </option>
        ))}
      </select>
      <a className="btn ghost" href="/ekran" target="_blank" rel="noreferrer">{tx("Ekranı aç")}</a>
    </section>
  );
}
