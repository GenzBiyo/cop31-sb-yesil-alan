"use client";

import { useMemo, useRef, useState } from "react";
import { Copy, Download, ExternalLink, Trash2, Upload } from "lucide-react";
import { api, formatDate, useApi } from "@/lib/client";
import { useI18n } from "@/components/I18nProvider";
import { dayLabel, FORM_DAYS, MINISTRY_UNITS, OTHER_UNIT, SLOT_MINUTES, SLOT_TIMES, slotEnd, type StakeholderRow } from "@/lib/stakeholder-form";

type Tab = "yanitlar" | "toplantilar" | "takvim" | "gunler";

type AdminSlot = {
  date: string;
  time: string;
  open: boolean;
  booking: { email: string; company: string; topic: string; requester: string; attendees: { name: string; title: string }[] } | null;
};

function MinistryCalendar() {
  const { tx } = useI18n();
  const [unit, setUnit] = useState(MINISTRY_UNITS[0]);
  const { data, reload } = useApi<{ slots: AdminSlot[] }>(`/api/ministry-slots?unit=${encodeURIComponent(unit)}`);
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<AdminSlot | null>(null);
  const slots = data?.slots || [];
  const at = (date: string, time: string) => slots.find((s) => s.date === date && s.time === time);
  const openCount = slots.filter((s) => s.open).length;
  const booked = slots.filter((s) => s.booking).length;

  async function change(body: Record<string, unknown>) {
    setBusy(true);
    try {
      await api("/api/ministry-slots", { method: "POST", body: JSON.stringify({ unit, ...body }) });
      reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-4 space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="display text-2xl">{tx("Bakanlık birim takvimi")}</h2>
          <p className="text-xs text-[#57534e]">
            {tx("Slotlar varsayılan olarak kapalıdır. Açtığınız saatler paydaş formunda seçilebilir hale gelir. Her saat başı bir görüşme,")} {SLOT_MINUTES} {tx("dakika.")}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {MINISTRY_UNITS.map((u) => (
            <button key={u} className={`tab ${unit === u ? "on" : ""}`} onClick={() => { setUnit(u); setDetail(null); }}>{u}</button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="badge ok">{openCount} {tx("açık")}</span>
        <span className="badge warn">{booked} {tx("dolu")}</span>
        <button className="btn ghost text-xs" disabled={busy} onClick={() => void change({ open: true })}>{tx("Tüm takvimi aç")}</button>
        <button className="btn ghost text-xs" disabled={busy} onClick={() => void change({ open: false })}>{tx("Tüm boş saatleri kapat")}</button>
      </div>
      <div className="overflow-x-auto">
        <table className="text-xs border-collapse">
          <thead>
            <tr>
              <th className="p-1 text-left">{tx("Gün")}</th>
              {SLOT_TIMES.map((t) => <th key={t} className="p-1 font-semibold text-[#3E6A88]">{t}</th>)}
              <th className="p-1" />
            </tr>
          </thead>
          <tbody>
            {FORM_DAYS.map((d) => {
              const dayOpen = SLOT_TIMES.some((t) => at(d, t)?.open);
              return (
                <tr key={d}>
                  <td className="p-1 pr-3 font-semibold text-[#0077C2] whitespace-nowrap">{tx(dayLabel(d))}</td>
                  {SLOT_TIMES.map((t) => {
                    const s = at(d, t);
                    const cls = s?.booking
                      ? "bg-[#F59E0B] text-white border-[#F59E0B]"
                      : s?.open
                        ? "bg-[#22A34A] text-white border-[#22A34A]"
                        : "bg-[#EEF1F3] text-[#8A959D] border-[#E1E6EA]";
                    return (
                      <td key={t} className="p-0.5">
                        <button
                          disabled={busy}
                          title={s?.booking ? `${s.booking.company} · ${s.booking.topic}` : s?.open ? tx("Açık — kapatmak için tıklayın") : tx("Kapalı — açmak için tıklayın")}
                          className={`w-[5.5rem] h-9 border px-1 truncate ${cls}`}
                          onClick={() => (s?.booking ? setDetail(s) : void change({ date: d, time: t, open: !s?.open }))}
                        >
                          {s?.booking ? s.booking.company : s?.open ? tx("Açık") : tx("Kapalı")}
                        </button>
                      </td>
                    );
                  })}
                  <td className="p-1">
                    <button className="text-[#0077C2] underline whitespace-nowrap" disabled={busy} onClick={() => void change({ date: d, open: !dayOpen })}>
                      {dayOpen ? tx("Günü kapat") : tx("Günü aç")}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {detail?.booking ? (
        <div className="border border-[#F59E0B] bg-[#FFF8E8] p-3 text-sm space-y-1">
          <p>
            <strong>{detail.booking.company}</strong> · {tx(dayLabel(detail.date))} {detail.time}–{slotEnd(detail.time)} · {unit}
          </p>
          <p>{tx("Konu")}: {detail.booking.topic}</p>
          <p>{tx("Talep eden")}: {detail.booking.requester} · {detail.booking.email}</p>
          <p>{tx("Katılımcılar")}: {detail.booking.attendees.map((p) => (p.title ? `${p.name} (${p.title})` : p.name)).join(", ")}</p>
          <div className="flex gap-2 pt-1">
            <button
              className="btn ghost text-xs"
              onClick={async () => {
                if (!window.confirm(tx("Bu rezervasyon iptal edilsin mi? Slot açık kalır."))) return;
                await change({ action: "release", date: detail.date, time: detail.time });
                setDetail(null);
              }}
            >
              {tx("Rezervasyonu iptal et")}
            </button>
            <button className="btn ghost text-xs" onClick={() => setDetail(null)}>{tx("Kapat")}</button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Flag({ on, label }: { on: boolean; label: string }) {
  const { tx } = useI18n();
  return <span className={`badge ${on ? "ok" : "muted"}`}>{tx(label)}: {on ? tx("Evet") : tx("Hayır")}</span>;
}

function csvCell(v: string | number) {
  const s = String(v ?? "");
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function StakeholderResponsesPage() {
  const { tx } = useI18n();
  const { data, reload } = useApi<{ responses: StakeholderRow[] }>("/api/stakeholders");
  const { data: me } = useApi<{ role: string }>("/api/auth/me");
  const [tab, setTab] = useState<Tab>("yanitlar");
  const [info, setInfo] = useState("");
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const rows = useMemo(() => data?.responses || [], [data]);
  const formUrl = typeof window === "undefined" ? "/paydas-formu" : `${window.location.origin}/paydas-formu`;

  const meetings = useMemo(
    () =>
      rows.flatMap((r) => {
        const mm = r.ministryMeeting;
        const ministry =
          mm && mm.wanted === "Evet"
            ? [
                {
                  key: `${r.id}-sb`,
                  company: r.companyName,
                  email: r.email,
                  ministry: true,
                  with: `Sağlık Bakanlığı · ${mm.unit === OTHER_UNIT ? `Diğer: ${mm.other}` : mm.unit}`,
                  topic: mm.request ? `${mm.topic} — ${mm.request}` : mm.topic,
                  when: mm.date && mm.time ? `${dayLabel(mm.date)} · ${mm.time}–${slotEnd(mm.time)}` : mm.unit === OTHER_UNIT ? "Saat belirlenecek" : "Slot seçilmedi",
                  requester: mm.requester,
                  attendees: mm.attendees,
                },
              ]
            : [];
        const others = r.meetingRequests.map((m, i) => ({
          key: `${r.id}-${i}`,
          company: r.companyName,
          email: r.email,
          ministry: false,
          with: m.with,
          topic: m.topic,
          when: `${m.date ? dayLabel(m.date) : "Gün fark etmez"} · ${m.timeOfDay}`,
          requester: "",
          attendees: m.attendees,
        }));
        return [...ministry, ...others];
      }),
    [rows]
  );
  const stats = useMemo(
    () => ({
      speakers: rows.filter((r) => r.speakerWilling).length,
      presentation: rows.filter((r) => r.presentation).length,
      stand: rows.filter((r) => r.standWanted).length,
      interactive: rows.filter((r) => r.interactive.startsWith("Evet")).length,
      meetingHost: rows.filter((r) => r.meetingHost === "Evet").length,
      ministry: rows.filter((r) => r.ministryMeeting?.wanted === "Evet").length,
      incoming: rows.filter((r) => r.meetingIncoming === "Evet").length,
      unanswered: rows.filter((r) => !r.meetingHost || !r.ministryMeeting).length,
      people: rows.reduce((n, r) => n + r.headcount, 0),
    }),
    [rows]
  );

  async function upload(file: File) {
    setInfo("");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await api<{ created: number; updated: number; skipped: number }>("/api/stakeholders", { method: "POST", body: fd });
      setInfo(`${tx("Excel içe aktarıldı")}: ${res.created} ${tx("yeni")}, ${res.updated} ${tx("güncellendi")}${res.skipped ? `, ${res.skipped} ${tx("atlandı (sitedeki yanıt daha yeni)")}` : ""}.`);
      reload();
    } catch (err) {
      setInfo(err instanceof Error ? err.message : tx("Yüklenemedi"));
    }
  }

  async function remove(r: StakeholderRow) {
    if (!window.confirm(`${r.companyName} ${tx("yanıtı silinsin mi?")}`)) return;
    await api(`/api/stakeholders?id=${r.id}`, { method: "DELETE" });
    reload();
  }

  function exportMeetings() {
    const lines = [["Firma", "E-posta", "Kiminle", "Konu", "Gün / saat", "Talep eden", "Katılımcı", "Unvan"].join(";")];
    for (const m of meetings) {
      const people = m.attendees.length ? m.attendees : [{ name: "", title: "" }];
      for (const p of people) {
        lines.push([m.company, m.email, m.with, m.topic, m.when, m.requester, p.name, p.title].map(csvCell).join(";"));
      }
    }
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "paydas-toplanti-talepleri.csv";
    a.click();
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.2em] uppercase text-[#0077C2]">{tx("Paydaş formu")}</p>
          <h1 className="display text-4xl">{tx("Paydaş yanıtları")}</h1>
          <p className="text-[#57534e]">{tx("Stand, sunum, panel, etkinlik ve toplantı talepleri tek yerde.")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a className="btn ghost" href="/paydas-formu" target="_blank" rel="noreferrer"><ExternalLink size={15} />{tx("Formu aç")}</a>
          <button
            className="btn ghost"
            onClick={() => {
              void navigator.clipboard.writeText(formUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            }}
          >
            <Copy size={15} />
            {copied ? tx("Kopyalandı") : tx("Form linkini kopyala")}
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}><Upload size={15} />{tx("Google Form Excel'i yükle")}</button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
              e.target.value = "";
            }}
          />
        </div>
      </header>
      {info ? <p className="card p-3 text-sm">{info}</p> : null}

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2">
        {[
          ["Yanıt", rows.length],
          ["Toplam kişi", stats.people],
          ["Panel konuşmacısı", stats.speakers],
          ["15 dk sunum", stats.presentation],
          ["Stand", stats.stand],
          ["İnteraktif etkinlik", stats.interactive],
          ["Bakanlık 1-1", stats.ministry],
          ["Diğer toplantı", stats.meetingHost],
        ].map(([k, v]) => (
          <div key={String(k)} className="card p-3">
            <div className="text-[10px] uppercase tracking-[0.12em] text-[#3E6A88]">{tx(String(k))}</div>
            <div className="display text-2xl text-[#0077C2]">{v}</div>
          </div>
        ))}
      </div>
      {stats.unanswered ? (
        <p className="card p-3 text-sm" style={{ borderLeft: "4px solid #F59E0B" }}>
          {stats.unanswered} {tx("firma toplantı sorularını (Bakanlık 1-1 ve diğer toplantılar) henüz yanıtlamadı; Google Form'da bu sorular yoktu. Form linkini bu firmalara gönderin; aynı e-postayla doldurduklarında yanıtları güncellenir.")}
        </p>
      ) : null}

      <div className="flex gap-1">
        {([
          ["yanitlar", `Yanıtlar (${rows.length})`],
          ["toplantilar", `Toplantı talepleri (${meetings.length})`],
          ["takvim", "Bakanlık takvimi"],
          ["gunler", "Günlere göre"],
        ] as [Tab, string][]).map(([k, label]) => (
          <button key={k} className={`tab ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>{tx(label)}</button>
        ))}
      </div>

      {tab === "yanitlar" ? (
        <div className="space-y-3">
          {rows.length === 0 ? <p className="text-sm text-[#57534e]">{tx("Henüz yanıt yok.")}</p> : null}
          {rows.map((r) => (
            <article key={r.id} className="card p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="display text-2xl leading-tight">{r.companyName}</h2>
                  <p className="text-xs text-[#57534e]">
                    {r.email}
                    {r.contactName ? ` · ${r.contactName}` : ""}
                    {r.contactPhone ? ` · ${r.contactPhone}` : ""} · {formatDate(r.submittedAt)} ·{" "}
                    {r.source === "google-form" ? tx("Google Form") : tx("Site formu")}
                  </p>
                </div>
                {me?.role === "ADMIN" ? (
                  <button className="btn ghost px-2" aria-label={tx("Sil")} onClick={() => void remove(r)}><Trash2 size={15} /></button>
                ) : null}
              </div>
              <p className="text-sm whitespace-pre-line"><strong>{tx("Ana tema")}:</strong> {r.theme}</p>
              <p className="text-sm">
                <strong>{r.headcount} {tx("kişi")}</strong> · {r.days.length} {tx("gün")}: {r.days.map((d) => tx(dayLabel(d))).join(", ")}
              </p>
              <div className="flex flex-wrap gap-1">
                <Flag on={r.speakerWilling} label="Panel konuşmacısı" />
                <Flag on={r.presentation} label="15 dk sunum" />
                <Flag on={r.standWanted} label="Stand" />
                {r.standWanted && r.standDays ? <span className="badge">{tx("Stand")}: {r.standDays}</span> : null}
                {r.videoReady ? <span className="badge">{tx("Video")}: {tx(r.videoReady)}</span> : null}
                {r.interactive ? <span className={`badge ${r.interactive.startsWith("Evet") ? "ok" : "muted"}`}>{tx("İnteraktif")}: {tx(r.interactive)}</span> : null}
              </div>
              {r.speakers.length ? (
                <div className="text-sm">
                  <strong>{tx("Konuşmacılar")}:</strong>
                  <ul className="mt-1 ml-4 list-disc">
                    {r.speakers.map((p, i) => <li key={i}>{p.name}{p.title ? ` — ${p.title}` : ""}</li>)}
                  </ul>
                </div>
              ) : null}
              <div className="text-sm border-t border-[#DCE8F0] pt-2">
                <strong>{tx("Bakanlık 1-1")}:</strong>{" "}
                {!r.ministryMeeting ? (
                  <span className="text-[#B45309]">{tx("Henüz yanıtlanmadı")}</span>
                ) : r.ministryMeeting.wanted !== "Evet" ? (
                  tx("İstemiyor")
                ) : (
                  <>
                    <b>{r.ministryMeeting.unit === OTHER_UNIT ? `${tx("Diğer")}: ${r.ministryMeeting.other}` : r.ministryMeeting.unit}</b>
                    {r.ministryMeeting.date && r.ministryMeeting.time
                      ? ` · ${tx(dayLabel(r.ministryMeeting.date))} ${r.ministryMeeting.time}–${slotEnd(r.ministryMeeting.time)}`
                      : r.ministryMeeting.unit !== OTHER_UNIT ? ` · ${tx("slot seçilmedi")}` : ""}
                    {` · ${r.ministryMeeting.topic}`}
                    <br />
                    <span className="text-xs text-[#57534e]">
                      {tx("Talep eden")}: {r.ministryMeeting.requester} · {tx("Katılımcılar")}:{" "}
                      {r.ministryMeeting.attendees.map((p) => (p.title ? `${p.name} (${p.title})` : p.name)).join(", ")}
                    </span>
                  </>
                )}
              </div>
              <div className="text-sm">
                <strong>{tx("Diğer toplantılar")}:</strong>{" "}
                {r.meetingHost ? (
                  <>
                    {tx("Toplantı yapmak istiyor")}: <b>{tx(r.meetingHost)}</b> · {tx("Gelen taleplere açık")}: <b>{tx(r.meetingIncoming)}</b>
                    {r.meetingRequests.length ? (
                      <ul className="mt-1 ml-4 list-disc">
                        {r.meetingRequests.map((m, i) => (
                          <li key={i}>
                            <b>{m.with}</b> — {m.topic} · {m.date ? tx(dayLabel(m.date)) : tx("Gün fark etmez")} · {tx(m.timeOfDay)}
                            <br />
                            <span className="text-xs text-[#57534e]">
                              {tx("Katılımcılar")}: {m.attendees.map((p) => (p.title ? `${p.name} (${p.title})` : p.name)).join(", ")}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </>
                ) : (
                  <span className="text-[#B45309]">{tx("Henüz yanıtlanmadı")}</span>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {tab === "toplantilar" ? (
        <section className="card p-4 space-y-3">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <h2 className="display text-2xl">{tx("Toplantı talepleri ve katılımcılar")}</h2>
            {meetings.length ? <button className="btn ghost" onClick={exportMeetings}><Download size={15} />{tx("Excel (CSV) indir")}</button> : null}
          </div>
          {meetings.length === 0 ? <p className="text-sm text-[#57534e]">{tx("Henüz toplantı talebi yok.")}</p> : null}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.1em] text-[#3E6A88]">
                  <th className="py-2 pr-3">{tx("Talep eden")}</th>
                  <th className="py-2 pr-3">{tx("Kiminle")}</th>
                  <th className="py-2 pr-3">{tx("Konu")}</th>
                  <th className="py-2 pr-3">{tx("Gün / saat")}</th>
                  <th className="py-2">{tx("Katılımcılar")}</th>
                </tr>
              </thead>
              <tbody>
                {meetings.map((m) => (
                  <tr key={m.key} className="border-t border-[#DCE8F0] align-top">
                    <td className="py-2 pr-3 font-medium">{m.company}</td>
                    <td className="py-2 pr-3">{m.ministry ? <strong className="text-[#0077C2]">{m.with}</strong> : m.with}</td>
                    <td className="py-2 pr-3">{m.topic}{m.requester ? <div className="text-xs text-[#57534e]">{tx("Talep eden")}: {m.requester}</div> : null}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{m.when}</td>
                    <td className="py-2">
                      <ol className="list-decimal ml-4">
                        {m.attendees.map((p, i) => <li key={i}>{p.name}{p.title ? <span className="text-[#57534e]"> — {p.title}</span> : null}</li>)}
                      </ol>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {tab === "takvim" ? <MinistryCalendar /> : null}

      {tab === "gunler" ? (
        <section className="card p-4">
          <h2 className="display text-2xl">{tx("Günlere göre katılım")}</h2>
          <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {FORM_DAYS.map((d) => {
              const firms = rows.filter((r) => r.days.includes(d));
              return (
                <div key={d} className="border border-[#DCE8F0] p-3">
                  <div className="flex justify-between text-sm">
                    <strong className="text-[#0077C2]">{tx(dayLabel(d))}</strong>
                    <span className="text-[#57534e]">{firms.length} {tx("firma")} · {firms.reduce((n, r) => n + r.headcount, 0)} {tx("kişi")}</span>
                  </div>
                  <ul className="mt-1 text-xs space-y-0.5">
                    {firms.map((r) => <li key={r.id}>{r.companyName}{r.standWanted ? ` · ${tx("stand")}` : ""}</li>)}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
