"use client";

import { use, useState } from "react";
import { api, useApi } from "@/lib/client";

type Company = {
  id: string;
  name: string;
  scope: string;
  topic: string;
  context: string;
  participationDates: string;
  contribution: string;
  status: string;
  booth: string;
  website: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  notes: string;
  rules: { id: string; title: string; body: string; dueDate: string; status: string; mandatory: boolean }[];
  submissions: { id: string; type: string; title: string; payload: string; status: string; eventDate: string }[];
};

export default function CompanyDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <CompanyEditor id={id} />;
}

function CompanyEditor({ id }: { id: string }) {
  const { data, reload } = useApi<Company>(`/api/companies/${id}`);
  const [rule, setRule] = useState({ title: "", body: "", dueDate: "" });
  if (!data) return <p>Yükleniyor…</p>;
  return (
    <div className="space-y-5">
      <div className="flex justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.2em] uppercase text-[#0077C2]">{data.scope}</p>
          <h1 className="display text-4xl">{data.name}</h1>
        </div>
        <a className="btn" href="/api/pdf/firma-dokuman">Hazırlık PDF</a>
      </div>
      <div className="grid md:grid-cols-2 gap-3 card p-4">
        <Field label="Konu" value={data.topic} onSave={(topic) => patch(id, { topic }, reload)} />
        <Field label="Katılım tarihleri" value={data.participationDates} onSave={(participationDates) => patch(id, { participationDates }, reload)} />
        <Field label="Katkı" value={data.contribution} onSave={(contribution) => patch(id, { contribution }, reload)} />
        <Field label="Stant" value={data.booth} onSave={(booth) => patch(id, { booth }, reload)} />
        <Field label="Durum" value={data.status} onSave={(status) => patch(id, { status }, reload)} />
        <Field label="İletişim e-posta" value={data.contactEmail} onSave={(contactEmail) => patch(id, { contactEmail }, reload)} />
        <label className="text-sm md:col-span-2">Bağlam
          <textarea className="field mt-1" defaultValue={data.context} onBlur={(e) => patch(id, { context: e.target.value }, reload)} />
        </label>
      </div>
      <section className="card p-4">
        <h2 className="display text-2xl">Atanan kurallar</h2>
        <ul className="mt-3 space-y-3">
          {data.rules.map((r) => (
            <li key={r.id} className="border-b border-[#DCE8F0] pb-2">
              <div className="flex justify-between gap-2">
                <strong>{r.title}</strong>
                <span className={`badge ${r.status === "Tamamlandı" ? "ok" : "warn"}`}>{r.status}</span>
              </div>
              <p className="text-sm text-[#57534e]">{r.body}</p>
              <p className="text-xs">Son tarih: {r.dueDate || "—"}</p>
            </li>
          ))}
        </ul>
        <div className="grid md:grid-cols-3 gap-2 mt-4">
          <input className="field" placeholder="Kural başlığı" value={rule.title} onChange={(e) => setRule({ ...rule, title: e.target.value })} />
          <input className="field" type="date" value={rule.dueDate} onChange={(e) => setRule({ ...rule, dueDate: e.target.value })} />
          <button className="btn" onClick={async () => {
            await api("/api/rules", { method: "POST", body: JSON.stringify({ action: "assign", companyId: id, ...rule }) });
            setRule({ title: "", body: "", dueDate: "" });
            await reload();
          }}>Kural ata</button>
          <textarea className="field md:col-span-3" placeholder="Açıklama" value={rule.body} onChange={(e) => setRule({ ...rule, body: e.target.value })} />
        </div>
      </section>
      <section className="card p-4">
        <h2 className="display text-2xl">Firma kayıtları (takvim / başvuru)</h2>
        <ul className="mt-3 space-y-2">
          {data.submissions.map((s) => (
            <li key={s.id} className="text-sm">
              <span className="badge muted">{s.type}</span> {s.title} · {s.eventDate || "tarihsiz"} · {s.status}
              <div className="text-[#57534e]">{s.payload}</div>
            </li>
          ))}
          {data.submissions.length === 0 ? <li className="text-sm text-[#57534e]">Henüz kayıt yok.</li> : null}
        </ul>
      </section>
    </div>
  );
}

function Field({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => void }) {
  return (
    <label className="text-sm">{label}
      <input className="field mt-1" defaultValue={value} onBlur={(e) => onSave(e.target.value)} />
    </label>
  );
}

async function patch(id: string, body: Record<string, string>, reload: () => Promise<void>) {
  await api(`/api/companies/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  await reload();
}
