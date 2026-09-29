"use client";

import { useMemo, useState } from "react";
import { api, formatDate, useApi, useRealtime } from "@/lib/client";
import { COP_DAY_OPTIONS } from "@/lib/cop-days";
import { useI18n } from "@/components/I18nProvider";
import { ConceptEditor } from "@/components/ConceptEditor";
import { emptyConcept, parseConcept, type SessionConcept } from "@/lib/session-concept";

type Person = { id: string; name: string; role: string; organization: string; email: string; track: string; kind: string };
type Session = {
  id: string;
  title: string;
  kind?: string;
  date: string;
  startTime: string;
  endTime: string;
  theme: string;
  topic: string;
  partners: string;
  status: string;
  location: string;
  notes: string;
  summary?: string;
  concept?: string;
  companyName?: string;
  companyId?: string;
  participants: { id: string; role: string; confirmed: string; person: Person }[];
  messages: { id: string; authorId: string; body: string; createdAt: string }[];
};

type Guest = { name: string; organization: string };

function guestsOf(session: Session) {
  const mod = session.participants.find((p) => p.role === "moderator");
  const speakers = session.participants.filter((p) => p.role !== "moderator");
  return {
    moderator: mod?.person.name || "",
    moderatorOrg: mod?.person.organization || "",
    speakers: speakers.map((p) => ({ name: p.person.name, organization: p.person.organization || "" })),
  };
}

export function SessionDesk({ mode }: { mode: "panel" | "sunum" }) {
  const { tx } = useI18n();
  const talk = mode === "sunum";
  const { data, reload } = useApi<{ panels: Session[]; people: Person[] }>("/api/panels");
  const { data: me } = useApi<{ role: string; companyId?: string | null }>("/api/auth/me");
  const canReview = me?.role === "ADMIN" || me?.role === "SAGLIK";
  const isFirma = me?.role === "FIRMA";
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    date: "2026-11-09",
    startTime: talk ? "10:15" : "10:00",
    endTime: talk ? "11:00" : "11:30",
    location: "Sağlık Pavilionu — Ana Sahne",
    topic: "",
    partners: "",
    moderator: "",
    moderatorOrg: "",
    summary: "",
  });
  const [speakers, setSpeakers] = useState<Guest[]>([{ name: "", organization: "" }]);
  const [concept, setConcept] = useState<SessionConcept>(emptyConcept());

  useRealtime((t) => {
    if (t === "panel" || t === "agenda") void reload();
  });

  const rows = useMemo(
    () => (data?.panels || []).filter((p) => (talk ? p.kind === "sunum" : p.kind !== "sunum")),
    [data?.panels, talk]
  );
  const grouped = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const p of rows) {
      if (!p.title.trim()) continue;
      if (p.status === "Onay bekliyor" || p.status === "Reddedildi") continue;
      const list = map.get(p.date) || [];
      list.push(p);
      map.set(p.date, list);
    }
    return COP_DAY_OPTIONS.map((opt) => ({ ...opt, rows: map.get(opt.date) || [] }));
  }, [rows]);

  function canEdit(session: Session) {
    if (canReview) return true;
    return isFirma && session.status === "Onay bekliyor" && session.companyId === (me?.companyId || "");
  }

  async function removeSession(id: string) {
    if (!confirm(tx(talk ? "Bu konuşmayı silmek istiyor musunuz?" : "Bu paneli silmek istiyor musunuz?"))) return;
    await api(`/api/panels/${id}`, { method: "DELETE" });
    if (openId === id) setOpenId(null);
    await reload();
  }

  async function createSession(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/panels", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          kind: mode,
          speakers: speakers.filter((s) => s.name.trim()),
          concept,
        }),
      });
      setForm({ ...form, title: "", topic: "", partners: "", moderator: "", moderatorOrg: "", summary: "" });
      setSpeakers([{ name: "", organization: "" }]);
      setConcept(emptyConcept());
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : tx("Kayıt alınamadı"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="display text-4xl">{tx(talk ? "Konuşmalar ve sunumlar" : "Paneller")}</h1>
        <p className="text-[#57534e]">
          {isFirma
            ? tx(talk ? "Konuşma veya sunum önerin. Onaylanınca programa yazılır." : "Panel önerin. Onaylanınca programa yazılır.")
            : tx(talk
              ? "Konuşmalar ve sunumlar buradan eklenir. Satıra tıklayınca özet ve detaylı konsept düzenlenir."
              : "Paneller buradan eklenir ve satıra tıklayınca düzenlenir. Konuşmalar ayrı sayfadadır.")}
        </p>
      </div>

      <form className="card p-4 grid md:grid-cols-4 gap-2" onSubmit={createSession}>
        <input className="field md:col-span-2" required placeholder={talk ? "Konuşma başlığı" : "Panel başlığı"} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <select className="field md:col-span-2" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}>
          {COP_DAY_OPTIONS.map((d) => (
            <option key={d.date} value={d.date}>{d.label}</option>
          ))}
        </select>
        <input className="field" type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
        <input className="field" type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
        <input className="field md:col-span-2" placeholder="Yer" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        <input className="field md:col-span-2" placeholder="Konu" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
        <input className="field md:col-span-2" placeholder="Paydaşlar" value={form.partners} onChange={(e) => setForm({ ...form, partners: e.target.value })} />
        <input className="field" placeholder="Moderatör" value={form.moderator} onChange={(e) => setForm({ ...form, moderator: e.target.value })} />
        <input className="field" placeholder="Moderatör kurumu" value={form.moderatorOrg} onChange={(e) => setForm({ ...form, moderatorOrg: e.target.value })} />
        <div className="md:col-span-4 space-y-2">
          <div className="text-xs tracking-[0.14em] uppercase text-[#0077C2]">{talk ? "Konuşmacılar" : "Panelistler"}</div>
          {speakers.map((s, i) => (
            <div key={i} className="grid md:grid-cols-2 gap-2">
              <input className="field" placeholder={`${talk ? "Konuşmacı" : "Panelist"} ${i + 1}`} value={s.name} onChange={(e) => setSpeakers(speakers.map((row, idx) => (idx === i ? { ...row, name: e.target.value } : row)))} />
              <input className="field" placeholder="Kurum" value={s.organization} onChange={(e) => setSpeakers(speakers.map((row, idx) => (idx === i ? { ...row, organization: e.target.value } : row)))} />
            </div>
          ))}
          <button type="button" className="btn ghost" onClick={() => setSpeakers([...speakers, { name: "", organization: "" }])}>{talk ? "Konuşmacı ekle" : "Panelist ekle"}</button>
        </div>
        <div className="md:col-span-4">
          <ConceptEditor summary={form.summary} concept={concept} onSummary={(summary) => setForm({ ...form, summary })} onConcept={setConcept} />
        </div>
        {error ? <p className="text-sm text-[#E31C23] md:col-span-4">{error}</p> : null}
        <button className="btn" disabled={busy}>{busy ? tx("Kaydediliyor…") : isFirma ? tx("SB'ye öner") : tx(talk ? "Konuşma ekle" : "Panel ekle")}</button>
      </form>

      {rows.some((p) => p.status === "Onay bekliyor") ? (
        <section className="card p-4 space-y-3">
          <h2 className="display text-2xl">{tx("Firma önerileri")}</h2>
          <p className="text-sm text-[#57534e]">{tx("Onaylanınca ana programa ve gündeme işlenir.")}</p>
          {rows.filter((p) => p.status === "Onay bekliyor").map((p) => (
            <div key={p.id} className="border border-[#B5DFF2] p-3 space-y-2">
              <div className="flex justify-between gap-2 flex-wrap">
                <div>
                  <div className="text-xs text-[#0077C2]">{talk ? "Sunum" : "Panel"} · {formatDate(p.date)} · {p.startTime}–{p.endTime}</div>
                  <div className="font-semibold">{p.title}</div>
                  <div className="text-sm text-[#57534e]">{p.companyName || p.partners} · {p.topic}</div>
                </div>
                <span className="badge warn">{tx("Onay bekliyor")}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {canReview ? (
                  <>
                    <button className="btn" onClick={async () => { await api(`/api/panels/${p.id}`, { method: "PATCH", body: JSON.stringify({ review: "approve" }) }); await reload(); }}>{tx("Onayla")}</button>
                    <button className="btn ghost" onClick={async () => { await api(`/api/panels/${p.id}`, { method: "PATCH", body: JSON.stringify({ review: "reject" }) }); await reload(); }}>{tx("Reddet")}</button>
                  </>
                ) : null}
                {canEdit(p) ? (
                  <button className="btn ghost" style={{ color: "#E31C23" }} onClick={() => void removeSession(p.id)}>{tx("Sil")}</button>
                ) : null}
              </div>
            </div>
          ))}
        </section>
      ) : null}

      <div className="space-y-4">
        {grouped.map((g) => (
          <section key={g.date} className="space-y-2">
            <h2 className="text-xs tracking-[0.16em] uppercase text-[#0077C2]">{g.label}</h2>
            {g.rows.length === 0 ? <p className="text-sm text-[#57534e]">Bu günde kayıt yok.</p> : null}
            {g.rows.map((p) => {
              const people = guestsOf(p);
              return (
                <div key={p.id} className="space-y-2">
                  <div className={`card p-4 ${openId === p.id ? "ring-2 ring-[#00A3E0]" : ""}`}>
                    <div className="flex justify-between gap-2 items-start">
                      <button
                        className="text-left flex-1 min-w-0"
                        onClick={() => {
                          if (!canEdit(p)) return;
                          setOpenId((id) => (id === p.id ? null : p.id));
                        }}
                      >
                        <div className="text-xs text-[#0077C2]">{talk ? "Sunum" : "Panel"} · {p.startTime}–{p.endTime}</div>
                        <div className="display text-2xl">{p.title}</div>
                        <div className="text-sm text-[#57534e]">
                          {people.moderator ? `Moderatör: ${people.moderator} · ` : ""}
                          {people.speakers.map((s) => s.name).filter(Boolean).join(", ") || p.topic || `${p.participants.length} kişi`}
                        </div>
                      </button>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className={`badge ${p.status === "Teyit edildi" || p.status === "Tamamlandı" ? "ok" : "warn"}`}>{tx(p.status)}</span>
                        {canEdit(p) ? (
                          <button className="btn ghost" style={{ color: "#E31C23" }} onClick={() => void removeSession(p.id)}>{tx("Sil")}</button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  {openId === p.id ? (
                    <SessionEditor
                      session={p}
                      people={data?.people || []}
                      canManage={!!canReview}
                      talk={talk}
                      onClose={() => setOpenId(null)}
                      onSaved={async () => { await reload(); }}
                    />
                  ) : null}
                </div>
              );
            })}
          </section>
        ))}
      </div>
    </div>
  );
}

function SessionEditor({
  session,
  people,
  canManage,
  talk,
  onClose,
  onSaved,
}: {
  session: Session;
  people: Person[];
  canManage: boolean;
  talk: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const initial = guestsOf(session);
  const [title, setTitle] = useState(session.title);
  const [date, setDate] = useState(session.date);
  const [startTime, setStartTime] = useState(session.startTime);
  const [endTime, setEndTime] = useState(session.endTime);
  const [location, setLocation] = useState(session.location);
  const [topic, setTopic] = useState(session.topic);
  const [partners, setPartners] = useState(session.partners);
  const [moderator, setModerator] = useState(initial.moderator);
  const [moderatorOrg, setModeratorOrg] = useState(initial.moderatorOrg);
  const [speakers, setSpeakers] = useState<Guest[]>(initial.speakers.length ? initial.speakers : [{ name: "", organization: "" }]);
  const [summary, setSummary] = useState(session.summary || "");
  const [concept, setConcept] = useState<SessionConcept>(() => parseConcept(session.concept));
  const [msg, setMsg] = useState("");
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await api(`/api/panels/${session.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title,
          kind: talk ? "sunum" : "panel",
          date,
          startTime,
          endTime,
          location,
          topic,
          partners,
          moderator,
          moderatorOrg,
          speakers: speakers.filter((s) => s.name.trim()),
          summary,
          concept,
        }),
      });
      await onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5 space-y-4 md:ml-4 border-[#00A3E0]">
      <div className="flex justify-between gap-2">
        <h2 className="display text-3xl">{title}</h2>
        <button className="btn ghost" onClick={onClose}>Kapat</button>
      </div>
      <div className="grid md:grid-cols-2 gap-2">
        <label className="text-sm md:col-span-2">Başlık<input className="field mt-1" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <label className="text-sm">Tarih
          <select className="field mt-1" value={date} onChange={(e) => setDate(e.target.value)}>
            {COP_DAY_OPTIONS.map((d) => (
              <option key={d.date} value={d.date}>{d.label}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">Yer<input className="field mt-1" value={location} onChange={(e) => setLocation(e.target.value)} /></label>
        <label className="text-sm">Başlangıç<input className="field mt-1" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></label>
        <label className="text-sm">Bitiş<input className="field mt-1" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></label>
        <label className="text-sm md:col-span-2">Konu<input className="field mt-1" value={topic} onChange={(e) => setTopic(e.target.value)} /></label>
        <label className="text-sm md:col-span-2">Paydaşlar<input className="field mt-1" value={partners} onChange={(e) => setPartners(e.target.value)} /></label>
        <label className="text-sm">Moderatör<input className="field mt-1" value={moderator} onChange={(e) => setModerator(e.target.value)} /></label>
        <label className="text-sm">Moderatör kurumu<input className="field mt-1" value={moderatorOrg} onChange={(e) => setModeratorOrg(e.target.value)} /></label>
      </div>
      <div className="space-y-2">
        <div className="text-xs tracking-[0.14em] uppercase text-[#0077C2]">{talk ? "Konuşmacılar" : "Panelistler"}</div>
        {speakers.map((s, i) => (
          <div key={i} className="grid md:grid-cols-2 gap-2">
            <input className="field" placeholder="Ad" value={s.name} onChange={(e) => setSpeakers(speakers.map((row, idx) => (idx === i ? { ...row, name: e.target.value } : row)))} />
            <input className="field" placeholder="Kurum" value={s.organization} onChange={(e) => setSpeakers(speakers.map((row, idx) => (idx === i ? { ...row, organization: e.target.value } : row)))} />
          </div>
        ))}
        <button type="button" className="btn ghost" onClick={() => setSpeakers([...speakers, { name: "", organization: "" }])}>{talk ? "Konuşmacı ekle" : "Panelist ekle"}</button>
      </div>
      <ConceptEditor summary={summary} concept={concept} onSummary={setSummary} onConcept={setConcept} />
      {canManage ? (
        <>
          <div className="flex flex-wrap gap-2">
            <button className="btn" disabled={busy} onClick={() => void save()}>{busy ? "Kaydediliyor…" : "Kaydet"}</button>
          </div>
          <label className="text-sm">Durum
            <select className="field mt-1 max-w-xs" defaultValue={session.status} onChange={(e) => api(`/api/panels/${session.id}`, { method: "PATCH", body: JSON.stringify({ status: e.target.value }) })}>
              <option>Planlama</option>
              <option>Davetler gönderildi</option>
              <option>Teyit edildi</option>
              <option>Tamamlandı</option>
            </select>
          </label>
        </>
      ) : (
        <button className="btn" disabled={busy} onClick={() => void save()}>{busy ? "Kaydediliyor…" : "Kaydet"}</button>
      )}
      <h3 className="font-semibold">Kayıtlı kişiler</h3>
      <ul className="space-y-2">
        {session.participants.map((pt) => (
          <li key={pt.id} className="flex justify-between gap-2 text-sm">
            <span>
              <strong>{pt.person.name}</strong> · {pt.person.organization}
              <span className="badge muted ml-2">{pt.role === "moderator" ? "Moderatör" : "Konuşmacı"}</span>
            </span>
            <select className="field w-40" defaultValue={pt.confirmed} onChange={(e) => api(`/api/panels/${session.id}`, { method: "POST", body: JSON.stringify({ action: "confirm", participantId: pt.id, confirmed: e.target.value }) })}>
              <option>Beklemede</option>
              <option>Davet edildi</option>
              <option>Teyit</option>
              <option>Red</option>
            </select>
          </li>
        ))}
      </ul>
      {canManage && people.length ? (
        <div className="flex gap-2">
          <select id={`personPick-${session.id}`} className="field">
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.name} — {p.organization}</option>
            ))}
          </select>
          <button className="btn secondary" onClick={async () => {
            const personId = (document.getElementById(`personPick-${session.id}`) as HTMLSelectElement).value;
            await api(`/api/panels/${session.id}`, { method: "POST", body: JSON.stringify({ action: "assign", personId, role: talk ? "speaker" : "panelist" }) });
            await onSaved();
          }}>Listeden ekle</button>
        </div>
      ) : null}
      <h3 className="font-semibold">İletişim</h3>
      <div className="space-y-2 max-h-56 overflow-auto bg-[#EAF2F8] p-3">
        {session.messages.map((m) => (
          <div key={m.id} className="text-sm">{m.body}<div className="text-xs text-[#57534e]">{new Date(m.createdAt).toLocaleString("tr-TR")}</div></div>
        ))}
        {session.messages.length === 0 ? <p className="text-sm text-[#57534e]">Henüz mesaj yok.</p> : null}
      </div>
      <textarea className="field" rows={3} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={talk ? "Konuşmacılara not" : "Panelist ve moderatörlere not"} />
      <label className="text-sm flex items-center gap-2">
        <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
        Kayıtlı e-postalara da gönder
      </label>
      <button className="btn" onClick={async () => {
        await api(`/api/panels/${session.id}`, { method: "POST", body: JSON.stringify({ action: "message", body: msg, notify }) });
        setMsg("");
        await onSaved();
      }}>Gönder</button>
      <p className="text-xs text-[#57534e]">{formatDate(session.date)}</p>
    </div>
  );
}
