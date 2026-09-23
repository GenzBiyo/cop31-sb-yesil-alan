"use client";

import { useMemo, useState } from "react";
import { api, formatDate, useApi } from "@/lib/client";
import { useI18n } from "@/components/I18nProvider";

type Field = {
  id: string;
  key: string;
  label: string;
  type: string;
  required: boolean;
  options: string;
  help: string;
  sortOrder: number;
  enabled: boolean;
};
type Placement = { id: string; role: string; activity: { id: string; title: string; date: string }; application?: Application };
type Application = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  school: string;
  schoolType: string;
  department: string;
  city: string;
  englishLevel: string;
  otherLanguages: string;
  linkedin: string;
  instagram: string;
  daysCount: number;
  availableDates: string;
  motivation: string;
  skills: string;
  extra: string;
  status: string;
  adminNote: string;
  createdAt: string;
  placements: Placement[];
};
type Activity = {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  description: string;
  roleNeed: string;
  capacity: number;
  placements: Placement[];
};

const STATUSES = ["Beklemede", "Kabul edildi", "Yedek", "Yerleştirildi", "Reddedildi"];

export default function AmbassadorsAdminPage() {
  const { tx } = useI18n();
  const [tab, setTab] = useState<"apps" | "acts" | "form">("apps");
  const apps = useApi<Application[]>("/api/ambassador/applications");
  const acts = useApi<Activity[]>("/api/ambassador/activities");
  const form = useApi<{ intro: string; fields: Field[] }>("/api/ambassador/form");
  const pavilionEvents = useApi<{ slug: string; title: string }[]>("/api/events");
  const [filter, setFilter] = useState("Tümü");
  const [open, setOpen] = useState<Application | null>(null);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [info, setInfo] = useState("");
  const [activityForm, setActivityForm] = useState({
    title: "",
    date: "2026-11-09",
    startTime: "09:00",
    endTime: "18:00",
    location: "Sağlık Pavilionu",
    roleNeed: "Saha desteği",
    capacity: 8,
    description: "",
  });
  const [intro, setIntro] = useState<string | null>(null);
  const [fields, setFields] = useState<Field[] | null>(null);

  const rows = useMemo(() => {
    const list = apps.data || [];
    if (filter === "Tümü") return list;
    return list.filter((a) => a.status === filter);
  }, [apps.data, filter]);

  const accepted = (apps.data || []).filter((a) => a.status === "Kabul edildi" || a.status === "Yerleştirildi");

  async function decide(status: string) {
    if (!open) return;
    await api("/api/ambassador/applications", {
      method: "PATCH",
      body: JSON.stringify({ id: open.id, status, adminNote: note, message: message || undefined, notify: true }),
    });
    setInfo(`${open.fullName} — ${status}. Bilgilendirme e-postası kuyruğa alındı.`);
    setOpen(null);
    await apps.reload();
    await acts.reload();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="display text-4xl">{tx("İklim Sağlık Elçileri")}</h1>
        <p className="text-[#57534e]">Öğrenci gönüllü başvuruları, aktivite yerleştirme ve form düzenleme. Kayıt kabul bilgisi iletişim adreslerine gider.</p>
        <a className="text-sm text-[#0077C2] underline" href="/giris/elciler" target="_blank">Açık başvuru formu</a>
      </div>
      <div className="flex gap-2 flex-wrap">
        {[
          ["apps", "Başvurular"],
          ["acts", "Aktiviteler"],
          ["form", "Formu düzenle"],
        ].map(([id, label]) => (
          <button key={id} className={tab === id ? "btn" : "btn ghost"} onClick={() => setTab(id as typeof tab)}>
            {label}
          </button>
        ))}
      </div>
      {info ? <p className="text-sm text-[#22A34A]">{info}</p> : null}

      {tab === "apps" ? (
        <>
          <div className="flex gap-2 flex-wrap">
            {["Tümü", ...STATUSES].map((s) => (
              <button key={s} className={filter === s ? "btn" : "btn ghost"} onClick={() => setFilter(s)}>{s}</button>
            ))}
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Ad</th>
                  <th>Okul</th>
                  <th>Dil</th>
                  <th>Gün</th>
                  <th>İletişim</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id} className="cursor-pointer" onClick={() => { setOpen(a); setNote(a.adminNote); setMessage(""); }}>
                    <td>{a.fullName}<div className="text-xs text-[#57534e]">{a.city}</div></td>
                    <td>{a.schoolType} · {a.school}<div className="text-xs">{a.department}</div></td>
                    <td>{a.englishLevel}<div className="text-xs">{a.otherLanguages}</div></td>
                    <td>{a.daysCount}<div className="text-xs">{a.availableDates}</div></td>
                    <td className="text-xs">{a.email}<br />{a.phone}</td>
                    <td><span className={`badge ${a.status === "Kabul edildi" || a.status === "Yerleştirildi" ? "ok" : a.status === "Reddedildi" ? "high" : "warn"}`}>{a.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {tab === "acts" ? (
        <div className="space-y-4">
          <form
            className="card p-4 grid md:grid-cols-4 gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              await api("/api/ambassador/activities", { method: "POST", body: JSON.stringify(activityForm) });
              await acts.reload();
            }}
          >
            <input className="field md:col-span-2" placeholder="Aktivite" value={activityForm.title} onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })} />
            <input className="field" type="date" value={activityForm.date} onChange={(e) => setActivityForm({ ...activityForm, date: e.target.value })} />
            <input className="field" type="number" min={1} value={activityForm.capacity} onChange={(e) => setActivityForm({ ...activityForm, capacity: Number(e.target.value) })} />
            <input className="field" type="time" value={activityForm.startTime} onChange={(e) => setActivityForm({ ...activityForm, startTime: e.target.value })} />
            <input className="field" type="time" value={activityForm.endTime} onChange={(e) => setActivityForm({ ...activityForm, endTime: e.target.value })} />
            <input className="field" placeholder="Yer" value={activityForm.location} onChange={(e) => setActivityForm({ ...activityForm, location: e.target.value })} />
            <input className="field" placeholder="İhtiyaç duyulan rol" value={activityForm.roleNeed} onChange={(e) => setActivityForm({ ...activityForm, roleNeed: e.target.value })} />
            <textarea className="field md:col-span-4" placeholder="Açıklama" value={activityForm.description} onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })} />
            <button className="btn">Aktivite oluştur</button>
          </form>
          {(acts.data || []).map((act) => (
            <div key={act.id} className="card p-4">
              <div className="flex justify-between gap-2">
                <div>
                  <div className="text-xs text-[#0077C2]">{formatDate(act.date)} · {act.startTime}–{act.endTime}</div>
                  <h2 className="display text-2xl">{act.title}</h2>
                  <p className="text-sm text-[#57534e]">{act.location} · {act.roleNeed} · {act.placements.length}/{act.capacity}</p>
                </div>
                <button className="btn ghost" onClick={async () => { await fetch(`/api/ambassador/activities?id=${act.id}`, { method: "DELETE" }); await acts.reload(); }}>Sil</button>
              </div>
              <p className="text-sm mt-2">{act.description}</p>
              <ul className="mt-3 space-y-1 text-sm">
                {act.placements.map((p) => (
                  <li key={p.id} className="flex justify-between">
                    <span>{p.application?.fullName} — {p.role}</span>
                    <button className="text-[#0077C2]" onClick={async () => { await fetch(`/api/ambassador/activities?placementId=${p.id}`, { method: "DELETE" }); await acts.reload(); await apps.reload(); }}>Çıkar</button>
                  </li>
                ))}
              </ul>
              {act.placements.length > 0 ? (
                <div className="mt-3 text-xs space-y-1 bg-[#EAF2F8] p-2">
                  <div className="font-semibold">Elçi saha kayıt linkleri</div>
                  {act.placements.map((p) => (
                    <div key={`qr-${p.id}`}>
                      {p.application?.fullName}:{" "}
                      {(pavilionEvents.data || []).slice(0, 4).map((ev) => (
                        <a key={ev.slug} className="text-[#0077C2] mr-2 underline" href={`/e/${ev.slug}?elci=${encodeURIComponent(p.application?.fullName || "")}`} target="_blank">
                          {ev.title.slice(0, 28)}
                        </a>
                      ))}
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="flex gap-2 mt-3">
                <select id={`pick-${act.id}`} className="field">
                  <option value="">Kabul edilenlerden yerleştir</option>
                  {accepted.map((a) => (
                    <option key={a.id} value={a.id}>{a.fullName} · {a.englishLevel} · {a.skills}</option>
                  ))}
                </select>
                <button
                  className="btn secondary"
                  onClick={async () => {
                    const applicationId = (document.getElementById(`pick-${act.id}`) as HTMLSelectElement).value;
                    if (!applicationId) return;
                    await api("/api/ambassador/activities", {
                      method: "POST",
                      body: JSON.stringify({ action: "assign", activityId: act.id, applicationId, notify: true }),
                    });
                    setInfo("Yerleştirme yapıldı, öğrenciye e-posta iletildi.");
                    await acts.reload();
                    await apps.reload();
                  }}
                >
                  Yerleştir ve bildir
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {tab === "form" ? (
        <FormEditor
          intro={intro ?? form.data?.intro ?? ""}
          fields={fields ?? form.data?.fields ?? []}
          setIntro={setIntro}
          setFields={setFields}
          onSave={async () => {
            await api("/api/ambassador/form", {
              method: "PUT",
              body: JSON.stringify({ intro: intro ?? form.data?.intro, fields: fields ?? form.data?.fields }),
            });
            setInfo("Form kaydedildi. Açık başvuru sayfası güncellendi.");
            await form.reload();
          }}
        />
      ) : null}

      {open ? (
        <div className="card p-5 space-y-3">
          <div className="flex justify-between">
            <h2 className="display text-3xl">{open.fullName}</h2>
            <button className="btn ghost" onClick={() => setOpen(null)}>Kapat</button>
          </div>
          <div className="grid md:grid-cols-2 gap-2 text-sm">
            <div>E-posta: {open.email}</div>
            <div>Telefon: {open.phone}</div>
            <div>Okul: {open.schoolType} / {open.school}</div>
            <div>Bölüm: {open.department}</div>
            <div>Şehir: {open.city}</div>
            <div>İngilizce: {open.englishLevel}</div>
            <div>Diğer diller: {open.otherLanguages || "—"}</div>
            <div>Gün sayısı: {open.daysCount}</div>
            <div className="md:col-span-2">Uygun günler: {open.availableDates}</div>
            <div>LinkedIn: {open.linkedin || "—"}</div>
            <div>Instagram: {open.instagram || "—"}</div>
            <div className="md:col-span-2">Alanlar: {open.skills}</div>
            <div className="md:col-span-2">Motivasyon: {open.motivation}</div>
          </div>
          <label className="text-sm">İç not<textarea className="field mt-1" value={note} onChange={(e) => setNote(e.target.value)} /></label>
          <label className="text-sm">Öğrenciye gidecek mesaj (boşsa varsayılan metin)
            <textarea className="field mt-1" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Kayıt kabul / red / bilgilendirme metni" />
          </label>
          <div className="flex flex-wrap gap-2">
            <button className="btn" onClick={() => decide("Kabul edildi")}>Kabul et ve bildir</button>
            <button className="btn secondary" onClick={() => decide("Yedek")}>Yedek liste + bildir</button>
            <button className="btn ghost" onClick={() => decide("Reddedildi")}>Reddet ve bildir</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FormEditor({
  intro,
  fields,
  setIntro,
  setFields,
  onSave,
}: {
  intro: string;
  fields: Field[];
  setIntro: (v: string) => void;
  setFields: (v: Field[]) => void;
  onSave: () => Promise<void>;
}) {
  return (
    <div className="space-y-4">
      <label className="text-sm block">Formun başındaki not
        <textarea className="field mt-1" rows={6} value={intro} onChange={(e) => setIntro(e.target.value)} />
      </label>
      {fields.map((field, index) => (
        <div key={field.id} className="card p-3 grid md:grid-cols-2 gap-2">
          <input className="field" value={field.label} onChange={(e) => {
            const next = [...fields];
            next[index] = { ...field, label: e.target.value };
            setFields(next);
          }} />
          <div className="flex gap-2">
            <select className="field" value={field.type} onChange={(e) => {
              const next = [...fields];
              next[index] = { ...field, type: e.target.value };
              setFields(next);
            }}>
              {["text", "email", "tel", "url", "number", "textarea", "select", "multiselect"].map((t) => <option key={t}>{t}</option>)}
            </select>
            <label className="text-sm flex items-center gap-1">
              <input type="checkbox" checked={field.required} onChange={(e) => {
                const next = [...fields];
                next[index] = { ...field, required: e.target.checked };
                setFields(next);
              }} /> Zorunlu
            </label>
            <label className="text-sm flex items-center gap-1">
              <input type="checkbox" checked={field.enabled} onChange={(e) => {
                const next = [...fields];
                next[index] = { ...field, enabled: e.target.checked };
                setFields(next);
              }} /> Açık
            </label>
          </div>
          <input className="field" placeholder="Anahtar (fullName, email…)" value={field.key} onChange={(e) => {
            const next = [...fields];
            next[index] = { ...field, key: e.target.value };
            setFields(next);
          }} />
          <input className="field" placeholder="Yardım metni" value={field.help} onChange={(e) => {
            const next = [...fields];
            next[index] = { ...field, help: e.target.value };
            setFields(next);
          }} />
          {(field.type === "select" || field.type === "multiselect") ? (
            <textarea className="field md:col-span-2" placeholder="Seçenekler (her satır bir seçenek)" value={field.options} onChange={(e) => {
              const next = [...fields];
              next[index] = { ...field, options: e.target.value };
              setFields(next);
            }} />
          ) : null}
        </div>
      ))}
      <div className="flex gap-2">
        <button
          className="btn ghost"
          onClick={() =>
            setFields([
              ...fields,
              {
                id: `new-${Date.now()}`,
                key: `alan_${fields.length + 1}`,
                label: "Yeni alan",
                type: "text",
                required: false,
                options: "",
                help: "",
                sortOrder: fields.length + 1,
                enabled: true,
              },
            ])
          }
        >
          Alan ekle
        </button>
        <button className="btn" onClick={() => void onSave()}>Formu kaydet</button>
      </div>
    </div>
  );
}
