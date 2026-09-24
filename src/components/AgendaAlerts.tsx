"use client";

import { useCallback, useEffect, useState } from "react";
import { api, useRealtime } from "@/lib/client";
import { useI18n } from "@/components/I18nProvider";

type AlertItem = { id: string; title: string; body: string };

const EMAIL_KEY = "cop31_notify_email";

export function rememberNotifyEmail(email: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(EMAIL_KEY, email.trim().toLowerCase());
}

export function AgendaAlerts({ publicMode = false }: { publicMode?: boolean }) {
  const { tx } = useI18n();
  const [item, setItem] = useState<AlertItem | null>(null);
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!publicMode) return;
    setEmail(localStorage.getItem(EMAIL_KEY) || "");
  }, [publicMode]);

  const load = useCallback(async () => {
    try {
      if (publicMode) {
        const stored = localStorage.getItem(EMAIL_KEY) || "";
        if (!stored.includes("@")) return;
        const list = await api<AlertItem[]>(`/api/public/alerts?email=${encodeURIComponent(stored)}`);
        setItem(list[0] || null);
        return;
      }
      const list = await api<AlertItem[]>("/api/alerts");
      setItem(list[0] || null);
    } catch {
      /* public visitors without session are fine */
    }
  }, [publicMode]);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 20000);
    return () => window.clearInterval(t);
  }, [load, email]);

  useRealtime((type) => {
    if (type === "inbox" || type === "agenda" || type === "announcement") void load();
  });

  useEffect(() => {
    if (!item || typeof Notification === "undefined") return;
    if (Notification.permission === "granted") {
      new Notification(item.title, { body: item.body });
    }
  }, [item?.id]);

  async function dismiss() {
    if (!item) return;
    try {
      if (publicMode) {
        await api("/api/public/alerts", {
          method: "POST",
          body: JSON.stringify({ id: item.id, email: localStorage.getItem(EMAIL_KEY) }),
        });
      } else {
        await api("/api/inbox", { method: "PATCH", body: JSON.stringify({ id: item.id }) });
      }
    } catch {
      /* ignore */
    }
    setItem(null);
    void load();
  }

  async function allowNotify() {
    if (typeof Notification === "undefined") return;
    await Notification.requestPermission();
    if (item && Notification.permission === "granted") {
      new Notification(item.title, { body: item.body });
    }
  }

  if (!item) return null;

  return (
    <div className="agenda-alert" role="alertdialog" aria-labelledby="agenda-alert-title">
      <div className="agenda-alert-card">
        <p className="text-xs tracking-[0.18em] uppercase text-[#00A3E0]">{tx("Bildirim")}</p>
        <h2 id="agenda-alert-title" className="display text-2xl text-[#0077C2] mt-1">
          {tx(item.title)}
        </h2>
        <p className="text-sm mt-2 text-[#0B1C33]">{tx(item.body)}</p>
        <div className="flex flex-wrap gap-2 mt-4">
          <button className="btn" onClick={() => void dismiss()}>
            {tx("Tamam")}
          </button>
          <button className="btn ghost" onClick={() => void allowNotify()}>
            {tx("Telefon bildirimi aç")}
          </button>
        </div>
      </div>
    </div>
  );
}
