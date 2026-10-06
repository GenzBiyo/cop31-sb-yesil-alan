"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarDays, Send, Undo2 } from "lucide-react";
import { api, formatDate, useApi, useRealtime } from "@/lib/client";
import { useI18n } from "@/components/I18nProvider";
import { MeetingAvailability } from "@/components/MeetingAvailability";
import { ACCOUNT_KINDS, accountKind } from "@/lib/account-kinds";
import { COP_DATES, copDayMeta } from "@/lib/cop-days";
import { MINISTRY_UNITS } from "@/lib/stakeholder-form";

type Slot = { id: string; date: string; startTime: string; endTime: string; location: string; pending: boolean };
type Target = { id: string; name: string; kind: string; topic: string; days: string[]; slots: Slot[] };
type Incoming = Outgoing & { fromOrg: string; message: string };

type Outgoing = {
  id: string;
  kind: string;
  withKind: string;
  withName: string;
  topic: string;
  message: string;
  status: string;
  preferredDate: string;
  preferredTime: string;
  whenDate: string;
  startTime: string;
  endTime: string;
  location: string;
  note: string;
  fromName: string;
  createdAt: string;
};

const MINISTRY = "bakanlik";

function dayLabel(date: string) {
  const m = copDayMeta(date);
  return `${m.day} Kas · ${m.weekdayShort}`;
}

function statusClass(status: string) {
  if (status === "Kabul") return "badge ok";
  if (status === "Red") return "badge high";
  return "badge warn";
}

export default function ToplantilarPage() {
  const { tx } = useI18n();
  const me = useApi<{ role: string }>("/api/auth/me");
  const staff = me.data?.role === "ADMIN" || me.data?.role === "SAGLIK";
  const { data, reload } = useApi<{ directory: Target[]; outgoing: Outgoing[]; incoming?: Incoming[] }>("/api/meetings");
  const { data: companies, reload: reloadCompanies } = useApi<{ id: string; participationDates: string; formHint?: { days: string[] } | null }[]>(staff ? null : "/api/companies");
  const [form, setForm] = useState({ target: "", kind: "ikili", topic: "", message: "", slotId: "", preferredDate: "", preferredTime: "" });
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");

  useRealtime((t) => {
    if (t === "app" || t === "agenda") void reload();
  });

  const directory = data?.directory || [];
  const outgoing = data?.outgoing || [];
  const target = directory.find((d) => d.id === form.target);
  const grouped = useMemo(
    () => ACCOUNT_KINDS.map((k) => ({ kind: k, rows: directory.filter((d) => accountKind(d.kind).id === k.id) })).filter((g) => g.rows.length),
    [directory]
  );

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!form.target) return setError(tx("Kiminle görüşmek istediğinizi seçin"));
    if (target?.slots.length && !form.slotId) return setError(tx("Uygun saatlerden birini seçin"));
    const ministry = form.target.startsWith("bakanlik:");
    try {
      await api("/api/meetings", {
        method: "POST",
        body: JSON.stringify({
          kind: form.kind,
          withKind: ministry || form.target === MINISTRY ? MINISTRY : "firma",
          withId: ministry ? form.target.slice("bakanlik:".length) : form.target === MINISTRY ? "" : form.target,
          topic: form.topic,
          message: form.message,
          slotId: form.slotId || undefined,
          preferredDate: form.preferredDate,
          preferredTime: form.preferredTime,
        }),
      });
      setInfo(tx("Talebiniz iletildi. Karşı taraf onaylayınca bildirim alacaksınız."));
      setForm({ target: "", kind: "ikili", topic: "", message: "", slotId: "", preferredDate: "", preferredTime: "" });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : tx("Talep gönderilemedi"));
    }
  }

  async function withdraw(m: Outgoing) {
    if (!confirm(tx("Bu talep geri çekilsin mi?"))) return;
    try {
      await api(`/api/meetings?id=${m.id}`, { method: "DELETE" });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : tx("İşlem yapılamadı"));
    }
  }

  function when(m: Outgoing) {
    if (m.status === "Kabul") {
      return [m.whenDate, m.startTime && m.endTime ? `${m.startTime}–${m.endTime}` : m.startTime, m.location].filter(Boolean).join(" · ");
    }
    return [m.preferredDate, m.preferredTime].filter(Boolean).join(" · ") || tx("Saat belirtilmedi");
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.2em] uppercase text-[#0077C2]">{tx("Toplantı yönetimi")}</p>
          <h1 className="display text-4xl">{tx("Toplantılarım")}</h1>
          <p className="text-[#57534e]">
            {staff
              ? tx("Paydaşların Sağlık Bakanlığı birimlerinden istediği toplantıları burada kabul edin, saat ve yerini belirleyin.")
              : tx("Sağlık Bakanlığı genel müdürlükleri ve diğer paydaşlarla toplantı ayarlayın. Karşı taraf onaylayınca saat kesinleşir.")}
          </p>
        </div>
        {staff ? null : <Link className="btn ghost" href="/takvimim"><CalendarDays size={16} />{tx("Takvimimi gör")}</Link>}
      </header>

      {staff ? <MinistryDesk incoming={data?.incoming || []} onDone={reload} /> : null}

      {staff ? null : <section className="card p-4 space-y-3">
        <h2 className="display text-2xl">{tx("Yeni toplantı talebi")}</h2>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={send}>
          <label className="text-sm">
            {tx("Kiminle?")}
            <select
              className="field mt-1"
              value={form.target}
              onChange={(e) => setForm({ ...form, target: e.target.value, slotId: "" })}
            >
              <option value="">{tx("Seçin")}</option>
              <optgroup label={tx("Sağlık Bakanlığı")}>
                {MINISTRY_UNITS.map((unit) => (
                  <option key={unit} value={`bakanlik:${unit}`}>{tx("T.C. Sağlık Bakanlığı")} · {unit}</option>
                ))}
              </optgroup>
              {grouped.map((g) => (
                <optgroup key={g.kind.id} label={tx(g.kind.label)}>
                  {g.rows.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}{d.kind === "konusmaci" && d.topic ? ` · ${d.topic}` : ""}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="text-sm">
            {tx("Görüşme türü")}
            <select className="field mt-1" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
              <option value="ikili">{tx("İkili görüşme")}</option>
              <option value="toplanti">{tx("Toplantı")}</option>
            </select>
          </label>

          {target?.slots.length ? (
            <div className="md:col-span-2 space-y-2">
              <p className="text-sm">{tx("Uygun saatler")}</p>
              {[...new Set(target.slots.map((s) => s.date))].map((date) => (
                <div key={date} className="flex flex-wrap items-center gap-2">
                  <span className="text-xs w-24 text-[#57534e]">{dayLabel(date)}</span>
                  {target.slots.filter((s) => s.date === date).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`badge ${form.slotId === s.id ? "ok" : "muted"}`}
                      onClick={() => setForm({ ...form, slotId: form.slotId === s.id ? "" : s.id })}
                      title={s.pending ? tx("Bu saat için başka talep de var") : s.location}
                    >
                      {s.startTime}–{s.endTime}{s.pending ? " ·" : ""}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          ) : form.target ? (
            <>
              <label className="text-sm">
                {tx("Tercih edilen gün")}
                <select className="field mt-1" value={form.preferredDate} onChange={(e) => setForm({ ...form, preferredDate: e.target.value })}>
                  <option value="">{tx("Fark etmez")}</option>
                  {(target?.days.length ? target.days : COP_DATES).map((d) => <option key={d} value={d}>{dayLabel(d)}</option>)}
                </select>
                {target?.days.length ? <span className="text-xs text-[#57534e]">{tx("Yalnızca paydaşın pavilyonda olduğu günler listelenir.")}</span> : null}
              </label>
              <label className="text-sm">
                {tx("Tercih edilen saat")}
                <input className="field mt-1" type="time" value={form.preferredTime} onChange={(e) => setForm({ ...form, preferredTime: e.target.value })} />
              </label>
              <p className="text-xs text-[#57534e] md:col-span-2">
                {form.target.startsWith("bakanlik:")
                  ? tx("İlgili genel müdürlük talebi görünce kabul eder ve saati netleştirir.")
                  : tx("Gün ve saat önerin. Karşı paydaş onaylarken saati kesinleştirir.")}
              </p>
            </>
          ) : null}

          <label className="text-sm md:col-span-2">
            {tx("Konu")}
            <input className="field mt-1" value={form.topic} maxLength={140} onChange={(e) => setForm({ ...form, topic: e.target.value })} required />
          </label>
          <label className="text-sm md:col-span-2">
            {tx("Mesaj (isteğe bağlı)")}
            <textarea className="field mt-1" rows={3} maxLength={500} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          </label>
          <div className="md:col-span-2 flex flex-wrap items-center gap-3">
            <button className="btn" type="submit"><Send size={16} />{tx("Toplantıyı ayarla")}</button>
            {info ? <span className="text-sm text-[#22A34A]">{info}</span> : null}
            {error ? <span className="text-sm text-[#c2410c]">{error}</span> : null}
          </div>
        </form>
      </section>}

      {staff ? null : <section className="card p-4 space-y-3">
        <h2 className="display text-2xl">{tx("Gönderdiğim talepler")}</h2>
        {outgoing.length === 0 ? <p className="text-sm text-[#57534e]">{tx("Henüz talep göndermediniz.")}</p> : null}
        <ul className="space-y-2">
          {outgoing.map((m) => (
            <li key={m.id} className="border border-[#e7e5e4] rounded-lg p-3 flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-1">
                <p className="font-medium">
                  {m.withName} <span className="text-xs text-[#57534e]">· {m.kind === "ikili" ? tx("İkili görüşme") : tx("Toplantı")}</span>
                </p>
                <p className="text-sm">{m.topic}</p>
                <p className="text-xs text-[#57534e]">{when(m)} · {tx("Gönderen")}: {m.fromName} · {formatDate(m.createdAt)}</p>
                {m.note ? <p className="text-xs text-[#57534e]">{tx("Not")}: {m.note}</p> : null}
              </div>
              <div className="flex items-center gap-2">
                <span className={statusClass(m.status)}>
                  {m.status === "Bekliyor" ? tx("Onay bekliyor") : m.status === "Kabul" ? tx("Kabul edildi") : tx("Reddedildi")}
                </span>
                {m.status === "Bekliyor" ? (
                  <button type="button" className="btn ghost" onClick={() => withdraw(m)} title={tx("Geri çek")}>
                    <Undo2 size={15} />{tx("Geri çek")}
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>}

      {!staff && companies?.[0] ? <MeetingAvailability company={companies[0]} onCompanyChange={reloadCompanies} /> : null}
    </div>
  );
}

function MinistryDesk({ incoming, onDone }: { incoming: Incoming[]; onDone: () => Promise<void> }) {
  const { tx } = useI18n();
  const [drafts, setDrafts] = useState<Record<string, { whenDate: string; startTime: string; endTime: string; location: string; note: string }>>({});
  const [error, setError] = useState("");

  function draft(m: Incoming) {
    return drafts[m.id] || {
      whenDate: m.whenDate || m.preferredDate,
      startTime: m.startTime || m.preferredTime,
      endTime: m.endTime,
      location: m.location || "Sağlık Pavilionu",
      note: m.note,
    };
  }

  async function decide(m: Incoming, status: "Kabul" | "Red") {
    setError("");
    const row = draft(m);
    try {
      await api("/api/meetings", {
        method: "PATCH",
        body: JSON.stringify({ id: m.id, status, ...row }),
      });
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : tx("İşlem yapılamadı"));
    }
  }

  return (
    <section className="card p-4 space-y-3">
      <h2 className="display text-2xl">{tx("Bakanlık toplantı talepleri")}</h2>
      {error ? <p className="text-sm text-[#c2410c]">{error}</p> : null}
      {!incoming.length ? <p className="text-sm text-[#57534e]">{tx("Henüz bakanlık birimine toplantı talebi yok.")}</p> : null}
      <ul className="space-y-3">
        {incoming.map((m) => {
          const row = draft(m);
          return (
            <li key={m.id} className="border border-[#e7e5e4] rounded-lg p-3 space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{m.withName}</p>
                  <p className="text-sm">{m.topic}</p>
                  <p className="text-xs text-[#57534e]">{m.fromName}{m.fromOrg ? ` · ${m.fromOrg}` : ""} · {formatDate(m.createdAt)}</p>
                  {m.message ? <p className="text-sm mt-1">{m.message}</p> : null}
                </div>
                <span className={statusClass(m.status)}>
                  {m.status === "Bekliyor" ? tx("Onay bekliyor") : m.status === "Kabul" ? tx("Kabul edildi") : tx("Reddedildi")}
                </span>
              </div>
              {m.status === "Bekliyor" ? (
                <div className="grid md:grid-cols-4 gap-2">
                  <input className="field" type="date" value={row.whenDate} onChange={(e) => setDrafts({ ...drafts, [m.id]: { ...row, whenDate: e.target.value } })} />
                  <input className="field" type="time" value={row.startTime} onChange={(e) => setDrafts({ ...drafts, [m.id]: { ...row, startTime: e.target.value } })} />
                  <input className="field" type="time" value={row.endTime} onChange={(e) => setDrafts({ ...drafts, [m.id]: { ...row, endTime: e.target.value } })} />
                  <input className="field" placeholder={tx("Yer")} value={row.location} onChange={(e) => setDrafts({ ...drafts, [m.id]: { ...row, location: e.target.value } })} />
                  <div className="md:col-span-4 flex flex-wrap gap-2">
                    <button type="button" className="btn" onClick={() => void decide(m, "Kabul")}>{tx("Kabul et ve saati kaydet")}</button>
                    <button type="button" className="btn ghost" onClick={() => void decide(m, "Red")}>{tx("Reddet")}</button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#57534e]">{[m.whenDate, m.startTime && m.endTime ? `${m.startTime}–${m.endTime}` : m.startTime, m.location].filter(Boolean).join(" · ")}</p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
