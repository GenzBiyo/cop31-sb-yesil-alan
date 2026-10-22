"use client";
import { Tx } from "@/components/I18nProvider";

import { use } from "react";
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
  submissions: { id: string; type: string; title: string; payload: string; quantity?: string; reviewNote?: string; status: string; eventDate: string }[];
};

export default function CompanyDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <CompanyEditor id={id} />;
}

function CompanyEditor({ id }: { id: string }) {
  const { data, reload } = useApi<Company>(`/api/companies/${id}`);
  if (!data) return <p><Tx>Yükleniyor…</Tx></p>;
  return (
    <div className="space-y-5">
      <div className="flex justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.2em] uppercase text-[#0077C2]">{data.scope}</p>
          <h1 className="display text-4xl">{data.name}</h1>
        </div>
        <a className="btn" href="/api/pdf/firma-dokuman"><Tx>Hazırlık PDF</Tx></a>
      </div>
      <div className="grid md:grid-cols-2 gap-3 card p-4">
        <Field label="Ana konu / tema" value={data.topic} onSave={(topic) => patch(id, { topic }, reload)} />
        <Field label="Katılım tarihleri" value={data.participationDates} onSave={(participationDates) => patch(id, { participationDates }, reload)} />
        <Area label="Kurum tanıtımı" value={data.context} onSave={(context) => patch(id, { context }, reload)} />
        <Area label="Pavilyona katkınız" value={data.contribution} onSave={(contribution) => patch(id, { contribution }, reload)} />
        <Field label="Web sitesi" value={data.website} onSave={(website) => patch(id, { website }, reload)} />
        <Field label="Durum" value={data.status} onSave={(status) => patch(id, { status }, reload)} />
        <Field label="Yetkili adı soyadı" value={data.contactName} onSave={(contactName) => patch(id, { contactName }, reload)} />
        <Field label="Yetkili e-posta" value={data.contactEmail} onSave={(contactEmail) => patch(id, { contactEmail }, reload)} />
        <Field label="Telefon" value={data.contactPhone} onSave={(contactPhone) => patch(id, { contactPhone }, reload)} />
        <Area label="Notlar" value={data.notes} onSave={(notes) => patch(id, { notes }, reload)} />
      </div>
      <section className="card p-4">
        <h2 className="display text-2xl"><Tx>Firma kayıtları (takvim / başvuru)</Tx></h2>
        <ul className="mt-3 space-y-2">
          {data.submissions.map((s) => (
            <li key={s.id} className="text-sm">
              <span className="badge muted">{s.type}</span> {s.title}{s.quantity ? ` · ${s.quantity}` : ""} · {s.eventDate || "tarihsiz"} · {s.status}
              <div className="text-[#57534e]">{s.payload}</div>
              {s.reviewNote ? <div className="text-xs">Gerekçe: {s.reviewNote}</div> : null}
            </li>
          ))}
          {data.submissions.length === 0 ? <li className="text-sm text-[#57534e]"><Tx>Henüz kayıt yok.</Tx></li> : null}
        </ul>
      </section>
    </div>
  );
}

function Field({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => void }) {
  return (
    <label className="text-sm"><Tx>{label}</Tx>
      <input key={value} className="field mt-1" defaultValue={value} onBlur={(e) => { if (e.target.value !== value) onSave(e.target.value); }} />
    </label>
  );
}

function Area({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => void }) {
  return (
    <label className="text-sm md:col-span-2"><Tx>{label}</Tx>
      <textarea key={value} className="field mt-1" rows={4} defaultValue={value} onBlur={(e) => { if (e.target.value !== value) onSave(e.target.value); }} />
    </label>
  );
}

async function patch(id: string, body: Record<string, string>, reload: () => Promise<void>) {
  await api(`/api/companies/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  await reload();
}
