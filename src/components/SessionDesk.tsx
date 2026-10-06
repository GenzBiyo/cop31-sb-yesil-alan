"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Eye, Plus, Printer, Trash2, X } from "lucide-react";
import { api, formatDate, useApi, useRealtime } from "@/lib/client";
import { COP_DAY_OPTIONS } from "@/lib/cop-days";
import { useI18n } from "@/components/I18nProvider";
import { ConceptEditor } from "@/components/ConceptEditor";
import { SessionBrief } from "@/components/SessionBrief";
import { useSpeakers } from "@/components/speakers";
import { parseDelegation } from "@/lib/delegation";
import {
  conceptCompletion,
  emptyConcept,
  GUEST_ROLE_LABELS,
  parseConcept,
  type SessionConcept,
} from "@/lib/session-concept";

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
  mine?: boolean;
  participants: Participant[];
  messages: { id: string; authorId: string; body: string; createdAt: string }[];
};
type Participant = {
  id: string;
  role: string;
  confirmed: string;
  companyId?: string;
  talkTitle?: string;
  talkNote?: string;
  own?: boolean;
  person: Person;
};

type Guest = { name: string; title: string; organization: string; role: string; talkTitle?: string };
type FirmTalkRow = { participantId?: string; name: string; title: string; talkTitle: string; talkNote: string; removable: boolean };
type FirmPeople = { companyId: string; names: { name: string; title: string }[] };

const ROLE_ORDER = ["acilis", "sunum", "panelist", "moderator", "kapanis"];

function blankGuest(talk: boolean): Guest {
  return { name: "", title: "", organization: "", role: talk ? "sunum" : "panelist" };
}

function lineupOf(session: Session): Guest[] {
  return session.participants.map((p) => ({
    name: p.person.name,
    title: p.person.role || "",
    organization: p.person.organization || "",
    role: ROLE_ORDER.includes(p.role) ? p.role : p.role === "speaker" ? "sunum" : "panelist",
    talkTitle: p.talkTitle || "",
  }));
}

function FirmTalks({ session, talk, firm, onSaved }: { session: Session; talk: boolean; firm: FirmPeople; onSaved: () => Promise<void> }) {
  const { tx } = useI18n();
  const initial = (): FirmTalkRow[] => {
    const own = session.participants
      .filter((p) => p.own)
      .map((p) => ({
        participantId: p.id,
        name: p.person.name,
        title: p.person.role || "",
        talkTitle: p.talkTitle || "",
        talkNote: p.talkNote || "",
        removable: p.companyId === firm.companyId,
      }));
    return own.length ? own : [{ name: "", title: "", talkTitle: "", talkNote: "", removable: true }];
  };
  const [rows, setRows] = useState<FirmTalkRow[]>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const listId = `firm-people-${session.id}`;

  function patch(i: number, part: Partial<FirmTalkRow>) {
    setRows(rows.map((r, idx) => (idx === i ? { ...r, ...part } : r)));
  }
  function pickName(i: number, name: string) {
    const match = firm.names.find((p) => p.name === name);
    patch(i, { name, ...(match && !rows[i].title ? { title: match.title } : {}) });
  }

  async function save() {
    setBusy(true);
    setMsg("");
    setError("");
    try {
      const res = await api<{ added: number }>(`/api/panels/${session.id}`, {
        method: "POST",
        body: JSON.stringify({
          action: "firm-talks",
          talks: rows
            .filter((r) => r.name.trim())
            .map((r) => ({ participantId: r.participantId, name: r.name, title: r.title, talkTitle: r.talkTitle, talkNote: r.talkNote })),
        }),
      });
      await onSaved();
      setMsg(
        `${tx("Kaydedildi, Sağlık Bakanlığına iletildi.")}${res.added ? ` ${res.added} ${tx("yeni konuşmacı onaya gönderildi.")}` : ""}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : tx("Kaydedilemedi"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-[#B5DFF2] bg-[#F2F9FD] p-3 space-y-3">
      <div>
        <div className="text-xs tracking-[0.14em] uppercase text-[#0077C2]">{tx(talk ? "Konuşmalarımız" : "Paneldeki konuşmalarımız")}</div>
        <p className="text-xs text-[#57534e]">
          {tx("Bu oturumda kurumunuz adına konuşacak kişiyi, unvanını, konuşma başlığını ve kısa içeriğini girin. Yeni isimler Konuşmacılar listesine onay için eklenir.")}
        </p>
      </div>
      <datalist id={listId}>
        {firm.names.map((p) => <option key={p.name} value={p.name}>{p.title}</option>)}
      </datalist>
      {rows.map((r, i) => (
        <div key={r.participantId || `new-${i}`} className="grid gap-2 md:grid-cols-2 bg-white border border-[#DCE8F0] p-2">
          <input className="field" list={listId} placeholder={tx("Konuşmacı ad soyad")} value={r.name} onChange={(e) => pickName(i, e.target.value)} />
          <input className="field" placeholder={tx("Unvan / görev")} value={r.title} onChange={(e) => patch(i, { title: e.target.value })} />
          <input className="field md:col-span-2" placeholder={tx("Konuşma başlığı")} value={r.talkTitle} onChange={(e) => patch(i, { talkTitle: e.target.value })} />
          <textarea className="field md:col-span-2" rows={2} maxLength={2000} placeholder={tx("Konuşmanın kısa içeriği, ana mesajlar, kullanılacak sunum/video")} value={r.talkNote} onChange={(e) => patch(i, { talkNote: e.target.value })} />
          <div className="md:col-span-2 flex justify-end">
            {r.removable ? (
              <button type="button" className="text-xs text-[#E31C23] underline" onClick={() => setRows(rows.filter((_, idx) => idx !== i))}>{tx("Kaldır")}</button>
            ) : (
              <span className="text-xs text-[#57534e]">{tx("Sağlık Bakanlığı tarafından eklendi; çıkarmak için SB ile iletişime geçin.")}</span>
            )}
          </div>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn ghost" disabled={rows.length >= 10} onClick={() => setRows([...rows, { name: "", title: "", talkTitle: "", talkNote: "", removable: true }])}>
          <Plus size={14} /> {tx("Konuşmacı ekle")}
        </button>
        <button type="button" className="btn" disabled={busy} onClick={() => void save()}>{busy ? tx("Kaydediliyor…") : tx("Konuşmaları kaydet")}</button>
        {msg ? <span className="text-sm text-[#22A34A]">{msg}</span> : null}
        {error ? <span className="text-sm text-[#E31C23]">{error}</span> : null}
      </div>
    </div>
  );
}

function minutesBetween(start: string, end: string) {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) return 0;
  return Math.max(0, toMin(end) - toMin(start));
}

function LineupEditor({ talk, guests, onChange }: { talk: boolean; guests: Guest[]; onChange: (next: Guest[]) => void }) {
  const { data } = useSpeakers();
  const known = data?.speakers || [];
  const listId = talk ? "speaker-pick-talk" : "speaker-pick-panel";

  function patch(i: number, part: Partial<Guest>) {
    onChange(guests.map((g, idx) => (idx === i ? { ...g, ...part } : g)));
  }
  function pickName(i: number, name: string) {
    const match = known.find((s) => s.name === name);
    const current = guests[i];
    patch(i, {
      name,
      ...(match
        ? { title: current.title || match.title, organization: current.organization || match.organization }
        : {}),
    });
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= guests.length) return;
    const next = [...guests];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-xs tracking-[0.14em] uppercase text-[#0077C2]">{talk ? "Konuşmacılar" : "Konuşmacılar ve moderatör"}</div>
        <span className="text-xs text-[#57534e]">
          Sıra, programda ve panel ekranında görünen sıradır. Adı Konuşmacılar listesinden seçerseniz fotoğrafı ekrana gelir.
        </span>
      </div>
      <datalist id={listId}>
        {known.map((s) => <option key={s.id} value={s.name}>{[s.title, s.organization].filter(Boolean).join(" · ")}</option>)}
      </datalist>
      {guests.map((g, i) => {
        const linked = known.some((s) => s.name === g.name.trim());
        return (
          <div key={i} className="grid gap-2 md:grid-cols-[1.3fr_1fr_1fr_10rem_auto] items-center">
            <div className="relative">
              <input className="field" list={listId} placeholder="Ad soyad" value={g.name} onChange={(e) => pickName(i, e.target.value)} />
              {linked ? <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#22A34A] font-semibold">fotoğraflı</span> : null}
            </div>
            <input className="field" placeholder="Unvan" value={g.title} onChange={(e) => patch(i, { title: e.target.value })} />
            <input className="field" placeholder="Kurum" value={g.organization} onChange={(e) => patch(i, { organization: e.target.value })} />
            <select className="field" value={g.role} onChange={(e) => patch(i, { role: e.target.value })}>
              {ROLE_ORDER.map((r) => <option key={r} value={r}>{GUEST_ROLE_LABELS[r]}</option>)}
            </select>
            <span className="flex">
              <button type="button" className="btn ghost px-2" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Yukarı"><ArrowUp size={14} /></button>
              <button type="button" className="btn ghost px-2" onClick={() => move(i, 1)} disabled={i === guests.length - 1} aria-label="Aşağı"><ArrowDown size={14} /></button>
              <button type="button" className="btn ghost px-2" onClick={() => onChange(guests.filter((_, idx) => idx !== i))} aria-label="Sil"><Trash2 size={14} /></button>
            </span>
          </div>
        );
      })}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn ghost" onClick={() => onChange([...guests, blankGuest(talk)])}>
          <Plus size={14} /> {talk ? "Konuşmacı ekle" : "Panelist ekle"}
        </button>
        {!talk && !guests.some((g) => g.role === "moderator") ? (
          <button type="button" className="btn ghost" onClick={() => onChange([...guests, { ...blankGuest(false), role: "moderator" }])}>
            <Plus size={14} /> Moderatör ekle
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ConceptBadge({ concept }: { concept?: string }) {
  const { percent } = conceptCompletion(parseConcept(concept));
  const tone = percent >= 80 ? "ok" : percent >= 30 ? "warn" : "muted";
  return <span className={`badge ${tone}`} title="Detaylı konsept notunun doluluğu">Konsept %{percent}</span>;
}

function PreviewSheet({
  talk,
  title,
  date,
  startTime,
  endTime,
  location,
  topic,
  guests,
  summary,
  concept,
  onClose,
}: {
  talk: boolean;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  topic: string;
  guests: Guest[];
  summary: string;
  concept: SessionConcept;
  onClose: () => void;
}) {
  const lineup = guests.filter((g) => g.name.trim());
  return (
    <div className="fixed inset-0 z-[80] bg-[rgba(11,28,51,0.55)] overflow-auto p-4 md:p-10 concept-print-backdrop" onClick={onClose}>
      <article className="concept-print mx-auto max-w-3xl bg-white p-6 md:p-8 space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-wrap items-center justify-between gap-2 no-print">
          <span className="text-xs tracking-[0.16em] uppercase text-[#57534e]">Ziyaretçi önizlemesi</span>
          <span className="flex gap-2">
            <button type="button" className="btn" onClick={() => window.print()}><Printer size={15} /> Yazdır / PDF</button>
            <button type="button" className="btn ghost" onClick={onClose}><X size={15} /> Kapat</button>
          </span>
        </div>
        <header className="space-y-1 border-b border-[#DCE8F0] pb-3">
          <p className="text-xs tracking-[0.18em] uppercase text-[#0077C2]">
            {talk ? "Konuşma" : "Panel"} · COP31 Sağlık Pavilionu
          </p>
          <h1 className="display text-3xl leading-tight">{title || "Başlıksız oturum"}</h1>
          {topic ? <p className="text-[#57534e]">{topic}</p> : null}
          <p className="text-sm font-semibold">
            {[formatDate(date), startTime && endTime ? `${startTime}–${endTime}` : startTime, location].filter(Boolean).join(" · ")}
          </p>
        </header>
        {lineup.length ? (
          <ul className="grid gap-2 sm:grid-cols-2">
            {lineup.map((g, i) => (
              <li key={`${g.name}-${i}`} className="border border-[#DCE8F0] p-2">
                <div className="font-semibold">{g.name}</div>
                <div className="text-xs text-[#57534e]">{[g.title, g.organization].filter(Boolean).join(" · ")}</div>
                {g.talkTitle ? <div className="text-xs italic mt-0.5">“{g.talkTitle}”</div> : null}
                <div className="text-[11px] uppercase tracking-[0.12em] text-[#00796B] mt-0.5">{GUEST_ROLE_LABELS[g.role] || g.role}</div>
              </li>
            ))}
          </ul>
        ) : null}
        <SessionBrief summary={summary} concept={concept} startOpen lineup={lineup} />
      </article>
    </div>
  );
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
  const [showForm, setShowForm] = useState(false);
  const [preview, setPreview] = useState(false);
  const [form, setForm] = useState({
    title: "",
    date: "2026-11-09",
    startTime: talk ? "10:15" : "10:00",
    endTime: talk ? "11:00" : "11:30",
    location: "Sağlık Pavilionu — Ana Sahne",
    topic: "",
    partners: "",
    summary: "",
  });
  const [guests, setGuests] = useState<Guest[]>([blankGuest(talk)]);
  const [concept, setConcept] = useState<SessionConcept>(emptyConcept());
  const [talkOpen, setTalkOpen] = useState<string | null>(null);
  const { data: myCompany } = useApi<{ id: string; delegation: string }[]>(isFirma ? "/api/companies" : null);
  const { data: mySpeakers } = useApi<{ speakers: { name: string; title: string }[] }>(isFirma ? "/api/speakers" : null);
  const firm = useMemo<FirmPeople | null>(() => {
    if (!isFirma || !myCompany?.[0]) return null;
    const names = [...parseDelegation(myCompany[0].delegation), ...(mySpeakers?.speakers || [])]
      .map((p) => ({ name: p.name, title: p.title }))
      .filter((p, i, all) => all.findIndex((q) => q.name === p.name) === i);
    return { companyId: myCompany[0].id, names };
  }, [isFirma, myCompany, mySpeakers]);

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
  const mineRows = useMemo(() => rows.filter((p) => p.mine && p.status !== "Reddedildi" && p.title.trim()), [rows]);

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
          guests: guests.filter((g) => g.name.trim()),
          concept,
        }),
      });
      setForm({ ...form, title: "", topic: "", partners: "", summary: "" });
      setGuests([blankGuest(talk)]);
      setConcept(emptyConcept());
      setShowForm(false);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : tx("Kayıt alınamadı"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
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
        <button type="button" className={showForm ? "btn ghost" : "btn"} onClick={() => setShowForm((v) => !v)}>
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? tx("Formu kapat") : tx(talk ? "Yeni konuşma ekle" : "Yeni panel ekle")}
        </button>
      </div>

      {showForm ? (
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
        <div className="md:col-span-4">
          <LineupEditor talk={talk} guests={guests} onChange={setGuests} />
        </div>
        <div className="md:col-span-4">
          <ConceptEditor
            summary={form.summary}
            concept={concept}
            onSummary={(summary) => setForm({ ...form, summary })}
            onConcept={setConcept}
            lineupNames={guests.map((g) => g.name).filter(Boolean)}
            sessionMinutes={minutesBetween(form.startTime, form.endTime)}
          />
        </div>
        {error ? <p className="text-sm text-[#E31C23] md:col-span-4">{error}</p> : null}
        <div className="md:col-span-4 flex flex-wrap gap-2">
          <button className="btn" disabled={busy}>{busy ? tx("Kaydediliyor…") : isFirma ? tx("SB'ye öner") : tx(talk ? "Konuşma ekle" : "Panel ekle")}</button>
          <button type="button" className="btn ghost" onClick={() => setPreview(true)}><Eye size={15} /> {tx("Önizle")}</button>
        </div>
        {preview ? (
          <PreviewSheet
            talk={talk}
            title={form.title}
            date={form.date}
            startTime={form.startTime}
            endTime={form.endTime}
            location={form.location}
            topic={form.topic}
            guests={guests}
            summary={form.summary}
            concept={concept}
            onClose={() => setPreview(false)}
          />
        ) : null}
      </form>
      ) : null}

      {firm ? (
        <section className="card p-4 space-y-3">
          <div>
            <h2 className="display text-2xl">{tx(talk ? "Yer aldığınız konuşma ve sunumlar" : "Yer aldığınız paneller")}</h2>
            <p className="text-sm text-[#57534e]">
              {tx("Önerdiğiniz, paydaş olarak eklendiğiniz veya kurumunuzdan birinin konuştuğu oturumlar. Konuşmacılarınızı ve konuşmalarınızı buradan girin.")}
            </p>
          </div>
          {mineRows.length === 0 ? (
            <p className="text-sm text-[#57534e]">
              {tx(talk
                ? "Henüz yer aldığınız bir konuşma yok. Sağlık Bakanlığı sizi bir oturuma eklediğinde burada görünür; kendi önerinizi “Yeni konuşma ekle” ile gönderebilirsiniz."
                : "Henüz yer aldığınız bir panel yok. Sağlık Bakanlığı sizi bir panele eklediğinde burada görünür; kendi önerinizi “Yeni panel ekle” ile gönderebilirsiniz.")}
            </p>
          ) : null}
          {mineRows.map((p) => {
            const own = p.participants.filter((x) => x.own);
            return (
              <div key={p.id} className="border border-[#DCE8F0] p-3 space-y-2">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <div className="text-xs text-[#0077C2]">{formatDate(p.date)} · {p.startTime}–{p.endTime} · {p.location}</div>
                    <div className="font-semibold">{p.title}</div>
                    <div className="text-sm text-[#57534e]">
                      {own.length
                        ? own.map((x) => `${x.person.name}${x.talkTitle ? ` — “${x.talkTitle}”` : ` (${tx("konuşma başlığı girilmedi")})`}`).join(" · ")
                        : tx("Bu oturuma henüz konuşmacı girmediniz.")}
                    </div>
                  </div>
                  <span className="flex gap-2 items-start">
                    <span className={`badge ${p.status === "Onay bekliyor" ? "warn" : "muted"}`}>{tx(p.status)}</span>
                    <button type="button" className={talkOpen === p.id ? "btn ghost" : "btn"} onClick={() => setTalkOpen(talkOpen === p.id ? null : p.id)}>
                      {talkOpen === p.id ? tx("Kapat") : own.length ? tx("Konuşmaları düzenle") : tx("Konuşmamızı gir")}
                    </button>
                  </span>
                </div>
                {talkOpen === p.id ? (
                  <FirmTalks key={own.map((x) => x.id).join(",")} session={p} talk={talk} firm={firm} onSaved={reload} />
                ) : null}
              </div>
            );
          })}
        </section>
      ) : null}

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
                <span className="flex gap-2 items-start">
                  <ConceptBadge concept={p.concept} />
                  <span className="badge warn">{tx("Onay bekliyor")}</span>
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {canReview ? (
                  <>
                    <button className="btn" onClick={async () => { await api(`/api/panels/${p.id}`, { method: "PATCH", body: JSON.stringify({ review: "approve" }) }); await reload(); }}>{tx("Onayla")}</button>
                    <button className="btn ghost" onClick={async () => { await api(`/api/panels/${p.id}`, { method: "PATCH", body: JSON.stringify({ review: "reject" }) }); await reload(); }}>{tx("Reddet")}</button>
                  </>
                ) : null}
                {canEdit(p) ? (
                  <>
                    <button className="btn ghost" onClick={() => setOpenId(p.id)}>{tx("Düzenle")}</button>
                    <button className="btn ghost" style={{ color: "#E31C23" }} onClick={() => void removeSession(p.id)}>{tx("Sil")}</button>
                  </>
                ) : null}
              </div>
              {openId === p.id ? (
                <SessionEditor
                  key={p.id}
                  session={p}
                  people={data?.people || []}
                  canManage={!!canReview}
                  talk={talk}
                  onClose={() => setOpenId(null)}
                  onSaved={async () => { await reload(); }}
                />
              ) : null}
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
              const lineup = lineupOf(p);
              const mod = lineup.find((x) => x.role === "moderator");
              const others = lineup.filter((x) => x.role !== "moderator").map((x) => x.name);
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
                          {mod ? `Moderatör: ${mod.name} · ` : ""}
                          {others.join(", ") || p.topic || `${p.participants.length} kişi`}
                        </div>
                      </button>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="flex gap-1.5">
                          <ConceptBadge concept={p.concept} />
                          <span className={`badge ${p.status === "Teyit edildi" || p.status === "Tamamlandı" ? "ok" : "warn"}`}>{tx(p.status)}</span>
                        </span>
                        {canEdit(p) ? (
                          <span className="flex gap-1">
                            <button className="btn ghost" onClick={() => setOpenId(p.id)}>{tx("Düzenle")}</button>
                            <button className="btn ghost" style={{ color: "#E31C23" }} onClick={() => void removeSession(p.id)}>{tx("Sil")}</button>
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  {openId === p.id ? (
                    <SessionEditor
                      key={p.id}
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
  const [title, setTitle] = useState(session.title);
  const [date, setDate] = useState(session.date);
  const [startTime, setStartTime] = useState(session.startTime);
  const [endTime, setEndTime] = useState(session.endTime);
  const [location, setLocation] = useState(session.location);
  const [topic, setTopic] = useState(session.topic);
  const [partners, setPartners] = useState(session.partners);
  const [guests, setGuests] = useState<Guest[]>(() => {
    const rows = lineupOf(session);
    return rows.length ? rows : [blankGuest(talk)];
  });
  const [summary, setSummary] = useState(session.summary || "");
  const [concept, setConcept] = useState<SessionConcept>(() => parseConcept(session.concept));
  const [msg, setMsg] = useState("");
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState("");
  const [preview, setPreview] = useState(false);

  async function save() {
    setBusy(true);
    setSaved("");
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
          guests: guests.filter((g) => g.name.trim()),
          summary,
          concept,
        }),
      });
      await onSaved();
      setSaved(`Kaydedildi · ${new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`);
    } catch (err) {
      setSaved(err instanceof Error ? err.message : "Kaydedilemedi");
    } finally {
      setBusy(false);
    }
  }

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      <button className="btn" disabled={busy} onClick={() => void save()}>{busy ? "Kaydediliyor…" : "Kaydet"}</button>
      <button type="button" className="btn ghost" onClick={() => setPreview(true)}><Eye size={15} /> Önizle / Yazdır</button>
      {saved ? <span className={`text-sm ${saved.startsWith("Kaydedildi") ? "text-[#22A34A]" : "text-[#E31C23]"}`}>{saved}</span> : null}
    </div>
  );

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
      </div>
      <LineupEditor talk={talk} guests={guests} onChange={setGuests} />
      <ConceptEditor
        summary={summary}
        concept={concept}
        onSummary={setSummary}
        onConcept={setConcept}
        lineupNames={guests.map((g) => g.name).filter(Boolean)}
        sessionMinutes={minutesBetween(startTime, endTime)}
      />
      {actions}
      {preview ? (
        <PreviewSheet
          talk={talk}
          title={title}
          date={date}
          startTime={startTime}
          endTime={endTime}
          location={location}
          topic={topic}
          guests={guests}
          summary={summary}
          concept={concept}
          onClose={() => setPreview(false)}
        />
      ) : null}
      {canManage ? (
        <label className="text-sm block">Durum
          <select className="field mt-1 max-w-xs" defaultValue={session.status} onChange={async (e) => {
            await api(`/api/panels/${session.id}`, { method: "PATCH", body: JSON.stringify({ status: e.target.value }) });
            setSaved(`Durum: ${e.target.value}`);
            await onSaved();
          }}>
            <option>Planlama</option>
            <option>Davetler gönderildi</option>
            <option>Teyit edildi</option>
            <option>Tamamlandı</option>
          </select>
        </label>
      ) : null}
      <h3 className="font-semibold">Katılım teyidi</h3>
      <ul className="space-y-2">
        {session.participants.map((pt) => (
          <li key={pt.id} className="flex justify-between gap-2 text-sm">
            <span>
              <strong>{pt.person.name}</strong>{pt.person.organization ? ` · ${pt.person.organization}` : ""}
              <span className="badge muted ml-2">{GUEST_ROLE_LABELS[pt.role] || (pt.role === "speaker" ? "Sunum" : "Panelist")}</span>
              {pt.companyId ? <span className="badge warn ml-1">Firma bildirdi</span> : null}
              {pt.talkTitle ? <span className="block text-[#0077C2]">Konuşma: “{pt.talkTitle}”</span> : null}
              {pt.talkNote ? <span className="block text-xs text-[#57534e] whitespace-pre-line">{pt.talkNote}</span> : null}
            </span>
            <select className="field w-40" defaultValue={pt.confirmed} onChange={(e) => api(`/api/panels/${session.id}`, { method: "POST", body: JSON.stringify({ action: "confirm", participantId: pt.id, confirmed: e.target.value }) })}>
              <option>Beklemede</option>
              <option>Davet edildi</option>
              <option>Teyit</option>
              <option>Red</option>
            </select>
          </li>
        ))}
        {session.participants.length === 0 ? <li className="text-sm text-[#57534e]">Kaydettikten sonra konuşmacılar burada teyit için listelenir.</li> : null}
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
            await api(`/api/panels/${session.id}`, { method: "POST", body: JSON.stringify({ action: "assign", personId, role: talk ? "sunum" : "panelist" }) });
            await onSaved();
          }}>Kişi havuzundan ekle</button>
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
