"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { activeLocaleTag } from "@/lib/i18n";

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    cache: "no-store",
    credentials: "include",
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    let message = "İstek başarısız";
    try {
      const data = await res.json();
      message = data.error || message;
    } catch {
      message = res.statusText;
    }
    throw new Error(message);
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return undefined as T;
}

export function useApi<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const startedRef = useRef(0);

  const reload = useCallback(async (force?: boolean) => {
    if (!url) return;
    if (abortRef.current) {
      if (!force && Date.now() - startedRef.current < 400) return;
      abortRef.current.abort();
      abortRef.current = null;
    }
    const ac = new AbortController();
    abortRef.current = ac;
    startedRef.current = Date.now();
    let timedOut = false;
    const timer = window.setTimeout(() => {
      timedOut = true;
      ac.abort();
    }, 25000);
    try {
      const json = await api<T>(url, { signal: ac.signal });
      if (ac.signal.aborted) return;
      if (json === undefined) {
        setError("Yanıt alınamadı");
        return;
      }
      setData(json);
      setError(null);
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        if (timedOut) setError("Yanıt gecikti");
        return;
      }
      if (!ac.signal.aborted) setError(e instanceof Error ? e.message : "Hata");
    } finally {
      window.clearTimeout(timer);
      if (abortRef.current === ac) abortRef.current = null;
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    setLoading(true);
    void reload();
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, [reload]);

  return { data, error, loading, reload, setData };
}

export function useGameLive(reload: () => void, backupMs = 12000) {
  const reloadRef = useRef(reload);
  reloadRef.current = reload;

  useEffect(() => {
    let last = 0;
    let es: EventSource | null = null;
    const kick = (force = false) => {
      if (typeof document !== "undefined" && document.hidden) return;
      const now = Date.now();
      if (!force && now - last < 1500) return;
      last = now;
      void reloadRef.current();
    };
    const connect = () => {
      if (es || document.hidden) return;
      es = new EventSource("/api/public/games/stream");
      es.addEventListener("game", () => kick(false));
    };
    const disconnect = () => {
      if (!es) return;
      es.close();
      es = null;
    };
    const onVis = () => {
      if (document.hidden) disconnect();
      else {
        connect();
        kick(true);
      }
    };
    connect();
    document.addEventListener("visibilitychange", onVis);
    const backup = setInterval(() => kick(true), backupMs);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      disconnect();
      clearInterval(backup);
    };
  }, [backupMs]);
}

export function useRealtime(onEvent: (type: string) => void) {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;
  useEffect(() => {
    const es = new EventSource("/api/realtime");
    const handler = (type: string) => () => handlerRef.current(type);
    ["message", "qa", "announcement", "inbox", "panel", "todo", "agenda", "account", "game"].forEach((type) => {
      es.addEventListener(type, handler(type));
    });
    return () => es.close();
  }, []);
}

export function formatDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(activeLocaleTag(), { day: "numeric", month: "short", year: "numeric" });
}

export function formatDay(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(activeLocaleTag(), { day: "numeric", month: "long", weekday: "long" });
}

export function copCountdown() {
  const start = new Date("2026-11-09T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((start.getTime() - now.getTime()) / 86400000);
}
