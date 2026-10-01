"use client";

import Link from "next/link";
import { useState } from "react";
import { api, useApi } from "@/lib/client";
import { useI18n } from "@/components/I18nProvider";
import { PavilionRulesDialog } from "@/components/PavilionRules";
import { accountKind } from "@/lib/account-kinds";

type Company = {
  id: string;
  name: string;
  kind: string;
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
  submissions: { id: string; type: string; title: string; payload: string; quantity?: string; reviewNote?: string; status: string; eventDate: string }[];
};

const COMPLIANCE = [
  { id: "etkinlik", label: "Etkinlik / sunum" },
  { id: "ikram", label: "İkram" },
  { id: "esantiyon", label: "Eşantiyon" },
];

export default function ProfilePage() {
  const { tx } = useI18n();
  const { data, reload } = useApi<Company[]>("/api/companies");
  const company = data?.[0];
  const [rulesOpen, setRulesOpen] = useState(false);
  const [sub, setSub] = useState({ type: "calendar", title: "", payload: "", eventDate: "" });
  const [item, setItem] = useState({ type: "esantiyon", title: "", quantity: "", payload: "" });
  const [formError, setFormError] = useState("");
  if (!company) return <p>Yükleniyor…</p>;
  const kind = accountKind(company.kind);
  const compliance = company.submissions.filter((row) => COMPLIANCE.some((kind) => kind.id === row.type));
  return (
    <div className="space-y-5">
      <PavilionRulesDialog open={rulesOpen} onClose={() => setRulesOpen(false)} />
      <div className="flex justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs tracking-[0.2em] uppercase text-[#0077C2]">{tx(kind.label)} · {tx("profil")}</p>
          <h1 className="display text-4xl">{company.name}</h1>
          <p className="text-[#57534e]">
            {kind.firmTools ? `${company.scope} · Stant ${company.booth || "atanacak"} · ` : ""}{tx(company.status)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-start">
          <Link className="btn secondary" href="/takvimim">{tx("Takvimimi gör")}</Link>
          <Link className="btn ghost" href="/toplantilar">{tx("Toplantılarım")}</Link>
          {kind.firmTools ? <button type="button" className="btn" onClick={() => setRulesOpen(true)}>{tx("Pavilyon Kullanım Kuralları")}</button> : null}
        </div>
      </div>
      <div className="card p-4 grid md:grid-cols-2 gap-3">
        <div><div className="text-xs uppercase text-[#57534e]">Konu</div><div>{company.topic || "—"}</div></div>
        <div><div className="text-xs uppercase text-[#57534e]">Katılım</div><div>{company.participationDates}</div></div>
        <div className="md:col-span-2"><div className="text-xs uppercase text-[#57534e]">Katkı</div><div>{company.contribution}</div></div>
        <div className="md:col-span-2"><div className="text-xs uppercase text-[#57534e]">Bağlam</div><div>{company.context}</div></div>
        <label className="text-sm">Yetkili adı<input className="field mt-1" defaultValue={company.contactName} onBlur={(e) => save(company.id, { contactName: e.target.value }, reload)} /></label>
        <label className="text-sm">Telefon<input className="field mt-1" defaultValue={company.contactPhone} onBlur={(e) => save(company.id, { contactPhone: e.target.value }, reload)} /></label>
      </div>
      {kind.firmTools ? (<>
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
      <section className="card p-4 space-y-3">
        <h2 className="display text-2xl">{tx("Etkinlik, ikram ve eşantiyon")}</h2>
        <p className="text-sm text-[#57534e]">
          {tx("Dağıtacağınız veya ikram edeceğiniz her kalemi adet ve tanımla Sağlık Bakanlığı onayına sunun. Uygun kararı almayan hiçbir şey pavilyonda dağıtılamaz.")}
        </p>
        <div className="grid md:grid-cols-4 gap-2">
          <select className="field" value={item.type} onChange={(e) => setItem({ ...item, type: e.target.value })}>
            {COMPLIANCE.map((kind) => <option key={kind.id} value={kind.id}>{tx(kind.label)}</option>)}
          </select>
          <input className="field md:col-span-2" placeholder="Tanım" value={item.title} onChange={(e) => setItem({ ...item, title: e.target.value })} />
          <input className="field" placeholder="Adet" value={item.quantity} onChange={(e) => setItem({ ...item, quantity: e.target.value })} />
          <textarea className="field md:col-span-4" placeholder="Ne, hangi malzeme, nasıl dağıtılacak" value={item.payload} onChange={(e) => setItem({ ...item, payload: e.target.value })} />
          <button className="btn" onClick={async () => {
            setFormError("");
            try {
              await api("/api/submissions", { method: "POST", body: JSON.stringify(item) });
              setItem({ ...item, title: "", quantity: "", payload: "" });
              await reload();
            } catch (err) {
              setFormError(err instanceof Error ? err.message : "Kayıt alınamadı");
            }
          }}>{tx("Onaya gönder")}</button>
          {formError ? <p className="text-sm text-[#E31C23] md:col-span-3">{tx(formError)}</p> : null}
        </div>
        <ul className="space-y-2">
          {compliance.map((row) => (
            <li key={row.id} className="border-b border-[#DCE8F0] pb-2 text-sm">
              <div className="flex justify-between gap-2">
                <div>
                  <span className="badge muted">{tx(COMPLIANCE.find((kind) => kind.id === row.type)?.label || row.type)}</span>{" "}
                  <strong>{row.title}</strong> · {row.quantity}
                </div>
                <span className={`badge ${row.status === "Uygun" ? "ok" : row.status === "Uygun değil" ? "high" : "warn"}`}>{tx(row.status)}</span>
              </div>
              {row.payload ? <div className="text-[#57534e] mt-1">{row.payload}</div> : null}
              {row.reviewNote ? <div className="text-xs mt-1">Gerekçe: {row.reviewNote}</div> : null}
              {row.status !== "Uygun" ? <div className="text-xs text-[#E31C23] mt-1">{tx("Bu kayıt dağıtılamaz.")}</div> : null}
            </li>
          ))}
          {compliance.length === 0 ? <li className="text-sm text-[#57534e]">{tx("Henüz başvuru yok.")}</li> : null}
        </ul>
      </section>
      </>) : null}
      <section className="card p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="display text-2xl">{tx("Toplantılar ve takvim")}</h2>
          <p className="text-sm text-[#57534e]">
            {tx("Uygun toplantı saatlerinizi açın, gelen talepleri onaylayın, diğer hesaplardan toplantı isteyin.")}
          </p>
        </div>
        <div className="flex gap-2">
          <Link className="btn" href="/toplantilar">{tx("Toplantılarım")}</Link>
          <Link className="btn ghost" href="/takvimim">{tx("Takvimimi gör")}</Link>
        </div>
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
          {company.submissions.filter((s) => !COMPLIANCE.some((kind) => kind.id === s.type)).map((s) => (
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
