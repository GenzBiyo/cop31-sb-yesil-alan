"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { useApi, useRealtime } from "@/lib/client";
import { useI18n } from "@/components/I18nProvider";
import { ParticipationDays } from "@/components/ParticipationDays";
import { copDayMeta } from "@/lib/cop-days";
import type { CalendarEntry, CalendarKind } from "@/lib/my-calendar";
import { formatParticipationDays } from "@/lib/participation";

type Payload = {
  company: { id: string; name: string; booth: string; participationDates: string };
  openDays: string[];
  days: { date: string; open: boolean; items: CalendarEntry[] }[];
  other: CalendarEntry[];
};

type FirmDays = { id: string; participationDates: string; formHint?: { days: string[] } | null };

const KINDS: Record<CalendarKind, { label: string; color: string }> = {
  katilim: { label: "Katılım günü", color: "#0077C2" },
  toplanti: { label: "Toplantı", color: "#22A34A" },
  talep: { label: "Toplantı talebi", color: "#F5A623" },
  slot: { label: "Boş toplantı saati", color: "#8FB8CF" },
  panel: { label: "Panel", color: "#E31C23" },
  sunum: { label: "Konuşma", color: "#00A3E0" },
  etkinlik: { label: "Etkinlik", color: "#32C45A" },
  program: { label: "Program", color: "#0B1C33" },
  sponsorluk: { label: "Oyun sponsorluğu", color: "#7C3AED" },
  katilacagim: { label: "Katılacağım", color: "#DB2777" },
  kayit: { label: "Takvim kaydı", color: "#57534E" },
};

const ORDER = Object.keys(KINDS) as CalendarKind[];

export default function MyCalendarPage() {
  const { tx } = useI18n();
  const [companyId, setCompanyId] = useState<string | null>(null);
  useEffect(() => {
    setCompanyId(new URLSearchParams(window.location.search).get("companyId") || "");
  }, []);
  const url = companyId === null ? null : `/api/my-calendar${companyId ? `?companyId=${companyId}` : ""}`;
  const { data, error, reload } = useApi<Payload>(url);
  const own = companyId === "";
  const { data: firms, reload: reloadFirms } = useApi<FirmDays[]>(own ? "/api/companies" : null);
  const firm = firms?.[0];
  const [hidden, setHidden] = useState<Set<CalendarKind>>(new Set(["slot"]));
  const [onlyBusy, setOnlyBusy] = useState(true);
  const [editDays, setEditDays] = useState(false);

  useRealtime((t) => {
    if (t === "agenda" || t === "panel" || t === "app") void reload();
  });

  const counts = useMemo(() => {
    const c = new Map<CalendarKind, number>();
    for (const d of data?.days || []) for (const i of d.items) c.set(i.kind, (c.get(i.kind) || 0) + 1);
    return c;
  }, [data]);

  if (error) return <p className="text-[#E31C23]">{tx(error)}</p>;
  if (!data) return <p>{tx("Yükleniyor…")}</p>;

  const days = data.days
    .map((d) => ({ ...d, items: d.items.filter((i) => !hidden.has(i.kind)) }))
    .filter((d) => !onlyBusy || d.items.length || d.open);

  function toggle(kind: CalendarKind) {
    setHidden((h) => {
      const next = new Set(h);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.2em] uppercase text-[#0077C2]">{data.company.name}</p>
          <h1 className="display text-4xl">{tx("Takvimim")}</h1>
          <p className="text-[#57534e]">
            {tx("Katılım günleriniz, toplantılarınız, panel ve konuşmalarınız, etkinlikleriniz, sponsorluklarınız ve katılmak istediğiniz oturumlar tek takvimde.")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Link className="btn ghost" href="/toplantilar">{tx("Toplantılarım")}</Link>
          <Link className="btn ghost" href="/program">{tx("Pavilyon gündemi")}</Link>
          <button type="button" className="btn ghost" onClick={() => window.print()}><Printer size={16} />{tx("Yazdır")}</button>
        </div>
      </div>

      {own && firm && (!data.openDays.length || editDays) ? (
        <div className="print:hidden">
          <ParticipationDays
            key={firm.participationDates}
            companyId={firm.id}
            participationDates={firm.participationDates}
            formDays={firm.formHint?.days}
            onCancel={data.openDays.length ? () => setEditDays(false) : undefined}
            onSaved={async () => {
              setEditDays(false);
              await Promise.all([reload(), reloadFirms()]);
            }}
          />
        </div>
      ) : data.openDays.length ? (
        <p className="text-sm border border-[#B5DFF2] bg-[#F2F9FD] p-2 print:hidden">
          {tx("Takviminiz katılım günlerinizde açık")}: <b className="text-[#0077C2]">{formatParticipationDays(data.openDays)}</b>. {tx("Diğer günler kapalı.")}{" "}
          {own ? <button type="button" className="underline" onClick={() => setEditDays(true)}>{tx("Günleri değiştir")}</button> : null}
        </p>
      ) : (
        <p className="text-sm border border-[#F5A623] bg-[#FFF8EC] p-2 print:hidden">
          {tx("Katılım günleri seçilmemiş; takvim kapalı.")}
        </p>
      )}

      <div className="flex flex-wrap gap-1.5 print:hidden">
        {ORDER.filter((k) => counts.get(k)).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => toggle(k)}
            aria-pressed={!hidden.has(k)}
            className="inline-flex items-center gap-1.5 px-2 py-1 text-xs border"
            style={hidden.has(k) ? { borderColor: "#DCE8F0", color: "#8A9AA8" } : { borderColor: KINDS[k].color, color: KINDS[k].color }}
          >
            <span className="w-2.5 h-2.5 inline-block" style={{ background: hidden.has(k) ? "#DCE8F0" : KINDS[k].color }} />
            {tx(KINDS[k].label)} · {counts.get(k)}
          </button>
        ))}
        <label className="inline-flex items-center gap-1 text-xs ml-2">
          <input type="checkbox" checked={onlyBusy} onChange={(e) => setOnlyBusy(e.target.checked)} />
          {tx("Yalnızca dolu günler")}
        </label>
      </div>

      {days.length === 0 ? (
        <p className="card p-4 text-[#57534e]">
          {tx("Takviminizde henüz kayıt yok. Toplantı saatlerinizi ekleyin veya pavilyon gündeminden katılmak istediğiniz oturumları seçin.")}
        </p>
      ) : null}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {days.map((d) => {
          const meta = copDayMeta(d.date);
          return (
            <section key={d.date} className={`card p-3 break-inside-avoid ${d.open ? "" : "bg-[#F3F4F6] opacity-80"}`}>
              <div className="flex items-baseline justify-between gap-2 border-b border-[#DCE8F0] pb-2 mb-2">
                <div className={`display text-2xl ${d.open ? "text-[#0077C2]" : "text-[#9AA5AD]"}`}>{meta.day} {tx("Kasım")} <span className="text-sm text-[#57534e]">{meta.weekday}</span></div>
                <div className="text-xs text-[#57534e] text-right">
                  {d.open ? tx(meta.theme) : <span className="badge muted">{tx("Kapalı")}</span>}
                </div>
              </div>
              {d.items.length === 0 ? <p className="text-xs text-[#57534e]">{tx(d.open ? "Bu gün boş." : "Katılım gününüz değil; takvim kapalı.")}</p> : null}
              <ul className="space-y-1.5">
                {d.items.map((item) => {
                  const k = KINDS[item.kind];
                  const body = (
                    <>
                      <div className="text-xs tabular-nums font-semibold w-[4.6rem] shrink-0" style={{ color: k.color }}>
                        {item.startTime
                          ? `${item.startTime}${item.endTime ? `–${item.endTime}` : ""}`
                          : item.kind === "katilim" || item.kind === "kayit"
                            ? tx("Tüm gün")
                            : tx("Saat belli değil")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: k.color }}>{tx(k.label)}</div>
                        <div className="text-sm font-semibold leading-snug">{item.title}</div>
                        {item.detail ? <div className="text-xs text-[#57534e] truncate">{item.detail}</div> : null}
                        <div className="text-[11px] text-[#57534e]">
                          {[item.location, item.status && item.status !== "Onaylandı" && item.status !== "Boş" ? tx(item.status) : ""].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                    </>
                  );
                  return (
                    <li key={item.id} className="border-l-4 pl-2" style={{ borderColor: k.color }}>
                      {item.href ? <Link href={item.href} className="flex gap-2 hover:bg-[#F2F9FD]">{body}</Link> : <div className="flex gap-2">{body}</div>}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
