"use client";

import { useMemo, useState } from "react";
import { api, formatDate, useApi, useRealtime } from "@/lib/client";
import { COP_DAY_OPTIONS } from "@/lib/cop-days";
import { CopDayGrid, CopDayDetail } from "@/components/CopDayGrid";
import type { PlanDay } from "@/lib/plan-types";
import { useI18n } from "@/components/I18nProvider";

type Person = { id: string; name: string; role: string; organization: string; email: string; track: string; kind: string };
type Panel = {
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
  companyName?: string;
  companyId?: string;
  participants: { id: string; role: string; confirmed: string; person: Person }[];
  messages: { id: string; authorId: string; body: string; createdAt: string }[];
};

type Guest = { name: string; organization: string };

const emptyForm = {
  title: "",
  kind: "panel" as "panel" | "sunum",
  date: "2026-11-09",
  startTime: "10:00",
  endTime: "11:30",
  location: "Sağlık Pavilionu — Ana Sahne",
  topic: "",
  partners: "",
  moderator: "",
  moderatorOrg: "",
};

function guestsOf(panel: Panel) {
  const mod = panel.participants.find((p) => p.role === "moderator");
  const speakers = panel.participants.filter((p) => p.role !== "moderator");
  return {
    moderator: mod?.person.name || "",
    moderatorOrg: mod?.person.organization || "",
    speakers: speakers.map((p) => ({ name: p.person.name, organization: p.person.organization || "" })),
  };
}

export default function PanelsPage() {
  const { tx } = useI18n();
  const { data, reload } = useApi<{ panels: Panel[]; people: Person[] }>("/api/panels");
  const { data: plan, reload: reloadPlan } = useApi<{ days: PlanDay[] }>("/api/plan");
  const { data: me } = useApi<{ role: string }>("/api/auth/me");
  const canReview = me?.role === "ADMIN" || me?.role === "SAGLIK";
  const isFirma = me?.role === "FIRMA";
  const [open, setOpen] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [speakers, setSpeakers] = useState<Guest[]>([{ name: "", organization: "" }]);

  useRealtime((t) => {
    if (t === "panel" || t === "agenda") {
      void reload();
      void reloadPlan();
    }
  });

  const panel = data?.panels.find((p) => p.id === open);
  const selectedDay = (plan?.days || []).find((d) => d.date === day) || null;
  const grouped = useMemo(() => {
    const map = new Map<string, Panel[]>();
    for (const p of data?.panels || []) {
      if (!p.title.trim()) continue;
      if (p.status === "Onay bekliyor" || p.status === "Reddedildi") continue;
      const list = map.get(p.date) || [];
      list.push(p);
      map.set(p.date, list);
    }
    return COP_DAY_OPTIONS.map((opt) => ({ ...opt, panels: map.get(opt.date) || [] }));
  }, [data?.panels]);

  async function createPanel(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/panels", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          speakers: speakers.filter((s) => s.name.trim()),
        }),
      });
      setForm({ ...emptyForm, date: form.date });
      setSpeakers([{ name: "", organization: "" }]);
      await reload();
      await reloadPlan();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="display text-4xl">{tx("Paneller ve sunumlar")}</h1>
        <p className="text-[#57534e]">
          {isFirma
            ? tx("Panel veya sunum önerin. Sağlık Bakanlığı hesabına onay için düşer; onaylanınca programa yazılır.")
            : "Konuşmacı, moderatör, gün ve saat girin. 12 günlük COP takviminde panel, sunum ve etkinlik birlikte görünür."}
        </p>
      </div>

      <CopDayGrid days={plan?.days || []} selected={day} onSelect={setDay} />
      <CopDayDetail day={selectedDay} />

      <form className="card p-4 grid md:grid-cols-6 gap-2" onSubmit={createPanel}>
        <div className="md:col-span-6 flex gap-2">
          <button type="button" className={`btn ${form.kind === "panel" ? "" : "ghost"}`} onClick={() => setForm({ ...form, kind: "panel" })}>Panel</button>
          <button type="button" className={`btn ${form.kind === "sunum" ? "" : "ghost"}`} onClick={() => setForm({ ...form, kind: "sunum" })}>Sunum</button>
        </div>
        <input className="field md:col-span-3" placeholder={form.kind === "sunum" ? "Sunum başlığı" : "Panel başlığı"} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <select className="field md:col-span-3" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}>
          {COP_DAY_OPTIONS.map((d) => (
            <option key={d.date} value={d.date}>{d.label}</option>
          ))}
        </select>
        <input className="field" type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
        <input className="field" type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
        <input className="field md:col-span-2" placeholder="Yer" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        <input className="field md:col-span-2" placeholder="Konu / özet" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
        <input className="field md:col-span-3" placeholder="Moderatör adı" value={form.moderator} onChange={(e) => setForm({ ...form, moderator: e.target.value })} />
        <input className="field md:col-span-3" placeholder="Moderatör kurumu" value={form.moderatorOrg} onChange={(e) => setForm({ ...form, moderatorOrg: e.target.value })} />
        <div className="md:col-span-6 space-y-2">
          <div className="text-xs tracking-[0.14em] uppercase text-[#0077C2]">Konuşmacılar</div>
          {speakers.map((s, i) => (
            <div key={i} className="grid md:grid-cols-2 gap-2">
              <input className="field" placeholder={`Konuşmacı ${i + 1} adı`} value={s.name} onChange={(e) => setSpeakers(speakers.map((row, idx) => (idx === i ? { ...row, name: e.target.value } : row)))} />
              <input className="field" placeholder="Kurum" value={s.organization} onChange={(e) => setSpeakers(speakers.map((row, idx) => (idx === i ? { ...row, organization: e.target.value } : row)))} />
            </div>
          ))}
          <button type="button" className="btn ghost" onClick={() => setSpeakers([...speakers, { name: "", organization: "" }])}>Konuşmacı ekle</button>
        </div>
        <input className="field md:col-span-4" placeholder="Paydaşlar (MoH, UN, EBRD…)" value={form.partners} onChange={(e) => setForm({ ...form, partners: e.target.value })} />
        <button className="btn md:col-span-2" disabled={busy}>
          {busy ? "Kaydediliyor…" : isFirma ? tx("SB'ye öner") : form.kind === "sunum" ? "Sunum ekle" : "Panel ekle"}
        </button>
      </form>

      {(data?.panels || []).some((p) => p.status === "Onay bekliyor") ? (
        <section className="card p-4 space-y-3">
          <h2 className="display text-2xl">{tx("Firma önerileri")}</h2>
          <p className="text-sm text-[#57534e]">{tx("Onaylanınca ana programa ve gündeme işlenir.")}</p>
          {(data?.panels || [])
            .filter((p) => p.status === "Onay bekliyor")
            .map((p) => (
              <div key={p.id} className="border border-[#B5DFF2] p-3 space-y-2">
                <div className="flex justify-between gap-2 flex-wrap">
                  <div>
                    <div className="text-xs text-[#0077C2]">
                      {p.kind === "sunum" ? "Sunum" : "Panel"} · {p.date} {p.startTime}–{p.endTime}
                    </div>
                    <div className="font-semibold">{p.title}</div>
                    <div className="text-sm text-[#57534e]">{p.companyName || p.partners} · {p.topic}</div>
                  </div>
                  <span className="badge warn">{tx("Onay bekliyor")}</span>
                </div>
                {canReview ? (
                  <div className="flex gap-2">
                    <button
                      className="btn"
                      onClick={async () => {
                        await api(`/api/panels/${p.id}`, { method: "PATCH", body: JSON.stringify({ review: "approve" }) });
                        await reload();
                        await reloadPlan();
                      }}
                    >
                      {tx("Onayla")}
                    </button>
                    <button
                      className="btn ghost"
                      onClick={async () => {
                        await api(`/api/panels/${p.id}`, { method: "PATCH", body: JSON.stringify({ review: "reject" }) });
                        await reload();
                        await reloadPlan();
                      }}
                    >
                      {tx("Reddet")}
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
        </section>
      ) : null}

      <div className="space-y-4">
        {grouped.map((g) => (
          <section key={g.date}>
            <h2 className="text-xs tracking-[0.16em] uppercase text-[#0077C2] mb-2">{g.label}</h2>
            {g.panels.length === 0 ? <p className="text-sm text-[#57534e] mb-3">Bu günde kayıt yok.</p> : null}
            <div className="space-y-2">
              {g.panels.map((p) => {
                const people = guestsOf(p);
                return (
                  <button key={p.id} className="w-full text-left card p-4 hover:bg-[#fff]" onClick={() => setOpen(p.id)}>
                    <div className="flex justify-between gap-3">
                      <div>
                        <div className="text-xs text-[#0077C2]">
                          {p.kind === "sunum" ? "Sunum" : "Panel"} · {p.startTime}–{p.endTime}
                        </div>
                        <div className="display text-2xl">{p.title}</div>
                        <div className="text-sm text-[#57534e]">
                          {people.moderator ? `Moderatör: ${people.moderator} · ` : ""}
                          {people.speakers.map((s) => s.name).filter(Boolean).join(", ") || `${p.participants.length} kişi`}
                        </div>
                      </div>
                      <span className={`badge ${p.status === "Teyit edildi" || p.status === "Tamamlandı" ? "ok" : "warn"}`}>{p.status}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {panel ? <PanelEditor key={panel.id} panel={panel} people={data?.people || []} canManage={!!canReview} onClose={() => setOpen(null)} onSaved={async () => { await reload(); await reloadPlan(); }} msg={msg} setMsg={setMsg} notify={notify} setNotify={setNotify} /> : null}
    </div>
  );
}

function PanelEditor({
  panel,
  people,
  canManage,
  onClose,
  onSaved,
  msg,
  setMsg,
  notify,
  setNotify,
}: {
  panel: Panel;
  people: Person[];
  canManage: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
  msg: string;
  setMsg: (v: string) => void;
  notify: boolean;
  setNotify: (v: boolean) => void;
}) {
  const initial = guestsOf(panel);
  const [title, setTitle] = useState(panel.title);
  const [kind, setKind] = useState(panel.kind === "sunum" ? "sunum" : "panel");
  const [date, setDate] = useState(panel.date);
  const [startTime, setStartTime] = useState(panel.startTime);
  const [endTime, setEndTime] = useState(panel.endTime);
  const [location, setLocation] = useState(panel.location);
  const [topic, setTopic] = useState(panel.topic);
  const [moderator, setModerator] = useState(initial.moderator);
  const [moderatorOrg, setModeratorOrg] = useState(initial.moderatorOrg);
  const [speakers, setSpeakers] = useState<Guest[]>(initial.speakers.length ? initial.speakers : [{ name: "", organization: "" }]);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await api(`/api/panels/${panel.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title,
          kind,
          date,
          startTime,
          endTime,
          location,
          topic,
          moderator,
          moderatorOrg,
          speakers: speakers.filter((s) => s.name.trim()),
        }),
      });
      await onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5 space-y-4">
      <div className="flex justify-between gap-2">
        <h2 className="display text-3xl">Düzenle</h2>
        <button className="btn ghost" onClick={onClose}>Kapat</button>
      </div>
      <div className="flex gap-2">
        <button type="button" className={`btn ${kind === "panel" ? "" : "ghost"}`} onClick={() => setKind("panel")}>Panel</button>
        <button type="button" className={`btn ${kind === "sunum" ? "" : "ghost"}`} onClick={() => setKind("sunum")}>Sunum</button>
      </div>
      <div className="grid md:grid-cols-2 gap-2">
        <input className="field md:col-span-2" value={title} onChange={(e) => setTitle(e.target.value)} />
        <select className="field" value={date} onChange={(e) => setDate(e.target.value)}>
          {COP_DAY_OPTIONS.map((d) => (
            <option key={d.date} value={d.date}>{d.label}</option>
          ))}
        </select>
        <input className="field" value={location} onChange={(e) => setLocation(e.target.value)} />
        <input className="field" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        <input className="field" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        <input className="field md:col-span-2" placeholder="Konu" value={topic} onChange={(e) => setTopic(e.target.value)} />
        <input className="field" placeholder="Moderatör" value={moderator} onChange={(e) => setModerator(e.target.value)} />
        <input className="field" placeholder="Moderatör kurumu" value={moderatorOrg} onChange={(e) => setModeratorOrg(e.target.value)} />
      </div>
      <div className="space-y-2">
        <div className="text-xs tracking-[0.14em] uppercase text-[#0077C2]">Konuşmacılar</div>
        {speakers.map((s, i) => (
          <div key={i} className="grid md:grid-cols-2 gap-2">
            <input className="field" placeholder="Ad" value={s.name} onChange={(e) => setSpeakers(speakers.map((row, idx) => (idx === i ? { ...row, name: e.target.value } : row)))} />
            <input className="field" placeholder="Kurum" value={s.organization} onChange={(e) => setSpeakers(speakers.map((row, idx) => (idx === i ? { ...row, organization: e.target.value } : row)))} />
          </div>
        ))}
        <button type="button" className="btn ghost" onClick={() => setSpeakers([...speakers, { name: "", organization: "" }])}>Konuşmacı ekle</button>
      </div>
      {canManage ? (
        <>
          <div className="flex flex-wrap gap-2">
            <button className="btn" disabled={busy} onClick={() => void save()}>{busy ? "Kaydediliyor…" : "Kaydet"}</button>
            <button
              className="btn ghost"
              onClick={async () => {
                if (!confirm("Bu kaydı silmek istiyor musunuz?")) return;
                await api(`/api/panels/${panel.id}`, { method: "DELETE" });
                onClose();
                await onSaved();
              }}
            >
              Sil
            </button>
          </div>
          <label className="text-sm">Durum
            <select className="field mt-1 max-w-xs" defaultValue={panel.status} onChange={(e) => api(`/api/panels/${panel.id}`, { method: "PATCH", body: JSON.stringify({ status: e.target.value }) })}>
              <option>Planlama</option>
              <option>Davetler gönderildi</option>
              <option>Teyit edildi</option>
              <option>Tamamlandı</option>
            </select>
          </label>
        </>
      ) : null}
      <h3 className="font-semibold">Kayıtlı kişiler</h3>
      <ul className="space-y-2">
        {panel.participants.map((pt) => (
          <li key={pt.id} className="flex justify-between gap-2 text-sm">
            <span>
              <strong>{pt.person.name}</strong> · {pt.person.organization}
              <span className="badge muted ml-2">{pt.role === "moderator" ? "Moderatör" : "Konuşmacı"}</span>
            </span>
            <select className="field w-40" defaultValue={pt.confirmed} onChange={(e) => api(`/api/panels/${panel.id}`, { method: "POST", body: JSON.stringify({ action: "confirm", participantId: pt.id, confirmed: e.target.value }) })}>
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
          <select id="personPick" className="field">
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.name} — {p.organization}</option>
            ))}
          </select>
          <button className="btn secondary" onClick={async () => {
            const personId = (document.getElementById("personPick") as HTMLSelectElement).value;
            await api(`/api/panels/${panel.id}`, { method: "POST", body: JSON.stringify({ action: "assign", personId, role: "panelist" }) });
            await onSaved();
          }}>Listeden ekle</button>
        </div>
      ) : null}
      <h3 className="font-semibold">İletişim</h3>
      <div className="space-y-2 max-h-56 overflow-auto bg-[#EAF2F8] p-3">
        {panel.messages.map((m) => (
          <div key={m.id} className="text-sm">{m.body}<div className="text-xs text-[#57534e]">{new Date(m.createdAt).toLocaleString("tr-TR")}</div></div>
        ))}
        {panel.messages.length === 0 ? <p className="text-sm text-[#57534e]">Henüz mesaj yok.</p> : null}
      </div>
      <textarea className="field" rows={3} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Panelist ve moderatörlere not" />
      <label className="text-sm flex items-center gap-2">
        <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
        Kayıtlı e-postalara da gönder
      </label>
      <button className="btn" onClick={async () => {
        await api(`/api/panels/${panel.id}`, { method: "POST", body: JSON.stringify({ action: "message", body: msg, notify }) });
        setMsg("");
        await onSaved();
      }}>Gönder</button>
      <p className="text-xs text-[#57534e]">{formatDate(panel.date)}</p>
    </div>
  );
}
