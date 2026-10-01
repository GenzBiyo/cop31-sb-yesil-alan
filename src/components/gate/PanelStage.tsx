"use client";

import { useEffect, useState } from "react";
import { MainLogo } from "@/components/SponsorRail";
import { SpeakerAvatar } from "@/components/speakers";
import { useI18n } from "@/components/I18nProvider";
import { localeTag } from "@/lib/i18n";

export type LivePanel = {
  id: string;
  title: string;
  kind: string;
  topic: string;
  theme: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  people: { id: string; name: string; role: string; title: string; organization: string; photoPath: string }[];
};

const POLL_MS = 15_000;

/** Polls the live panel for the pavilion display; always null when `enabled` is false. */
export function useLivePanel(enabled: boolean) {
  const [panel, setPanel] = useState<LivePanel | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const load = () =>
      fetch("/api/public/live-panel", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => alive && data && setPanel(data.panel || null))
        .catch(() => undefined);
    void load();
    const timer = window.setInterval(load, POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [enabled]);
  return enabled ? panel : null;
}

export function PanelStage({ panel }: { panel: LivePanel }) {
  const { tx, locale } = useI18n();
  const date = new Date(`${panel.date}T12:00:00`).toLocaleDateString(localeTag(locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
    weekday: "long",
  });
  const many = panel.people.length > 5;

  return (
    <section className="panel-stage" aria-live="polite">
      <MainLogo />
      <p className="panel-stage-kicker">
        {panel.kind === "sunum" ? tx("Şimdi sahnede · Konuşma") : tx("Şimdi sahnede · Panel")}
      </p>
      <h1 className="panel-stage-title">{panel.title}</h1>
      {panel.topic && panel.topic !== panel.title ? <p className="panel-stage-topic">{panel.topic}</p> : null}
      <p className="panel-stage-when">
        {[date, panel.startTime ? [panel.startTime, panel.endTime].filter(Boolean).join("–") : "", panel.location]
          .filter(Boolean)
          .join(" · ")}
      </p>
      {panel.people.length ? (
        <ul className={`panel-stage-people${many ? " is-many" : ""}`}>
          {panel.people.map((p) => {
            const detail = [...new Set([p.title, p.organization])].filter((v) => v && v !== p.name).join(" · ");
            return (
            <li key={p.id}>
              <SpeakerAvatar name={p.name} photoPath={p.photoPath} size={many ? 132 : 176} />
              <strong>{p.name}</strong>
              {detail ? <em>{detail}</em> : null}
              {/moderat/i.test(p.role) ? <span className="panel-stage-badge">{tx("Moderatör")}</span> : null}
            </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
