"use client";

import { useState } from "react";
import { api, useApi } from "@/lib/client";

type Company = {
  id: string;
  name: string;
  scope: string;
  topic: string;
  context: string;
  participationDates: string;
  contribution: string;
  booth: string;
  contactName: string;
  contactPhone: string;
  notes: string;
  status: string;
  rules: { id: string; title: string; body: string; dueDate: string; status: string }[];
  submissions: { id: string; type: string; title: string; payload: string; status: string; eventDate: string }[];
};

export default function ProfilePage() {
  const { data, reload } = useApi<Company[]>("/api/companies");
  const company = data?.[0];
  const [sub, setSub] = useState({ type: "calendar", title: "", payload: "", eventDate: "" });
  if (!company) return <p>Yükleniyor…</p>;
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs tracking-[0.2em] uppercase text-[#0077C2]">Firma profili</p>
        <h1 className="display text-4xl">{company.name}</h1>
        <p className="text-[#57534e]">{company.scope} · Stant {company.booth || "atanacak"} · {company.status}</p>
      </div>
      <div className="card p-4 grid md:grid-cols-2 gap-3">
        <div><div className="text-xs uppercase text-[#57534e]">Konu</div><div>{company.topic || "—"}</div></div>
        <div><div className="text-xs uppercase text-[#57534e]">Katılım</div><div>{company.participationDates}</div></div>
        <div className="md:col-span-2"><div className="text-xs uppercase text-[#57534e]">Katkı</div><div>{company.contribution}</div></div>
        <div className="md:col-span-2"><div className="text-xs uppercase text-[#57534e]">Bağlam</div><div>{company.context}</div></div>
        <label className="text-sm">Yetkili adı<input className="field mt-1" defaultValue={company.contactName} onBlur={(e) => save(company.id, { contactName: e.target.value }, reload)} /></label>
        <label className="text-sm">Telefon<input className="field mt-1" defaultValue={company.contactPhone} onBlur={(e) => save(company.id, { contactPhone: e.target.value }, reload)} /></label>
      </div>
      <section className="card p-4">
        <h2 className="display text-2xl">Size atanan kurallar</h2>
        <ul className="mt-3 space-y-3">
          {company.rules.map((r) => (
            <li key={r.id} className="flex justify-between gap-3 border-b border-[#DCE8F0] pb-2">
              <div>
                <div className="font-semibold">{r.title}</div>
                <div className="text-sm text-[#57534e]">{r.body}</div>
                <div className="text-xs">Son tarih {r.dueDate || "—"}</div>
              </div>
              <select
                className="field w-40"
                value={r.status}
                onChange={async (e) => {
                  await api("/api/rules", { method: "POST", body: JSON.stringify({ action: "status", id: r.id, status: e.target.value }) });
                  await reload();
                }}
              >
                <option>Bekliyor</option>
                <option>Devam Ediyor</option>
                <option>Tamamlandı</option>
              </select>
            </li>
          ))}
        </ul>
      </section>
      <section className="card p-4">
        <h2 className="display text-2xl">Takvim ve uygulamalar</h2>
        <p className="text-sm text-[#57534e] mb-3">Pavilion içindeki oturum, demo ve başvuru kayıtlarınızı girin.</p>
        <div className="grid md:grid-cols-4 gap-2">
          <select className="field" value={sub.type} onChange={(e) => setSub({ ...sub, type: e.target.value })}>
            <option value="calendar">Takvim kaydı</option>
            <option value="application">Başvuru / uygulama</option>
            <option value="document">Döküman notu</option>
          </select>
          <input className="field" placeholder="Başlık" value={sub.title} onChange={(e) => setSub({ ...sub, title: e.target.value })} />
          <input className="field" type="date" value={sub.eventDate} onChange={(e) => setSub({ ...sub, eventDate: e.target.value })} />
          <button className="btn" onClick={async () => {
            await api("/api/submissions", { method: "POST", body: JSON.stringify(sub) });
            setSub({ ...sub, title: "", payload: "" });
            await reload();
          }}>Kaydet</button>
          <textarea className="field md:col-span-4" placeholder="Ayrıntı" value={sub.payload} onChange={(e) => setSub({ ...sub, payload: e.target.value })} />
        </div>
        <ul className="mt-4 space-y-2">
          {company.submissions.map((s) => (
            <li key={s.id} className="text-sm border-b border-[#DCE8F0] pb-2">
              <span className="badge muted">{s.type}</span> {s.title} {s.eventDate ? `· ${s.eventDate}` : ""} — {s.status}
              <div className="text-[#57534e]">{s.payload}</div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

async function save(id: string, body: Record<string, string>, reload: () => Promise<void>) {
  await api(`/api/companies/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  await reload();
}
