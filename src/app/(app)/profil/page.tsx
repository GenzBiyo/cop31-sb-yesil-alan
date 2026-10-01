"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ImageUp } from "lucide-react";
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
  contactEmail: string;
  contactPhone: string;
  website: string;
  logoPath: string;
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
      <ProfileEditor key={company.id} company={company} reload={reload} />
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

const PROFILE_FIELDS: { key: keyof Company; label: string; area?: boolean; type?: string; placeholder?: string }[] = [
  { key: "topic", label: "Ana konu / tema" },
  { key: "participationDates", label: "Katılım günleri", placeholder: "Örn. 9–12 Kasım" },
  { key: "contribution", label: "Pavilyona katkınız", area: true },
  { key: "context", label: "Kurum tanıtımı", area: true },
  { key: "website", label: "Web sitesi", type: "url", placeholder: "https://" },
  { key: "contactName", label: "Yetkili adı soyadı" },
  { key: "contactEmail", label: "Yetkili e-posta", type: "email" },
  { key: "contactPhone", label: "Telefon", type: "tel" },
];

function ProfileEditor({ company, reload }: { company: Company; reload: () => Promise<void> }) {
  const { tx } = useI18n();
  const [form, setForm] = useState(() => Object.fromEntries(PROFILE_FIELDS.map((f) => [f.key, String(company[f.key] ?? "")])) as Record<string, string>);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dirty = PROFILE_FIELDS.some((f) => form[f.key] !== String(company[f.key] ?? ""));

  async function saveProfile() {
    setBusy(true);
    setMsg("");
    try {
      await api(`/api/companies/${company.id}`, { method: "PATCH", body: JSON.stringify(form) });
      await reload();
      setMsg(`${tx("Kaydedildi")} · ${new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : tx("Kaydedilemedi"));
    } finally {
      setBusy(false);
    }
  }

  async function uploadLogo(file: File) {
    setLogoBusy(true);
    setMsg("");
    const fd = new FormData();
    fd.append("file", file);
    try {
      await api(`/api/companies/${company.id}/logo`, { method: "POST", body: fd });
      await reload();
      setMsg(tx("Logo yüklendi"));
    } catch (err) {
      setMsg(err instanceof Error ? err.message : tx("Logo yüklenemedi"));
    } finally {
      setLogoBusy(false);
    }
  }

  return (
    <section className="card p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="display text-2xl">{tx("Kurum profili")}</h2>
        <span className="text-xs text-[#57534e]">{tx("Kurum adı değişikliği için Sağlık Bakanlığı ile iletişime geçin.")}</span>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <div className="w-40 h-24 border border-[#DCE8F0] bg-white flex items-center justify-center p-2">
          {company.logoPath ? (
            <img src={company.logoPath} alt={company.name} className="max-w-full max-h-full object-contain" />
          ) : (
            <span className="text-xs text-[#9AA5AD]">{tx("Logo yok")}</span>
          )}
        </div>
        <div className="space-y-1">
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn" disabled={logoBusy} onClick={() => fileRef.current?.click()}>
              <ImageUp size={15} />
              {logoBusy ? tx("Yükleniyor…") : company.logoPath ? tx("Logoyu değiştir") : tx("Logo yükle")}
            </button>
            {company.logoPath ? (
              <button
                type="button"
                className="btn ghost"
                onClick={async () => {
                  await api(`/api/companies/${company.id}/logo`, { method: "DELETE" });
                  await reload();
                }}
              >
                {tx("Kaldır")}
              </button>
            ) : null}
          </div>
          <p className="text-xs text-[#57534e]">{tx("PNG, JPG, WebP veya SVG · en fazla 4 MB · şeffaf arka planlı yatay logo önerilir")}</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadLogo(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {PROFILE_FIELDS.map((f) => (
          <label key={f.key} className={`text-sm ${f.area ? "md:col-span-2" : ""}`}>
            {tx(f.label)}
            {f.area ? (
              <textarea className="field mt-1" rows={3} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
            ) : (
              <input
                className="field mt-1"
                type={f.type || "text"}
                placeholder={f.placeholder ? tx(f.placeholder) : undefined}
                value={form[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              />
            )}
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn" disabled={busy || !dirty} onClick={() => void saveProfile()}>
          {busy ? tx("Kaydediliyor…") : tx("Profili kaydet")}
        </button>
        {msg ? <span className="text-sm text-[#22A34A]">{msg}</span> : null}
      </div>
    </section>
  );
}
