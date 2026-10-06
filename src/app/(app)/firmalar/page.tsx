"use client";

import Link from "next/link";
import { useState } from "react";
import { api, useApi } from "@/lib/client";
import { useI18n } from "@/components/I18nProvider";

type Company = {
  id: string;
  name: string;
  scope: string;
  topic: string;
  participationDates: string;
  contribution: string;
  status: string;
  booth: string;
  rules: { status: string }[];
  users?: { id: string; email: string; name: string; accountStatus: string }[];
};

const SCOPES = ["Local", "Global", "Startup", "UN", "Diğer"];
const EMPTY = {
  name: "",
  scope: "Local",
  topic: "",
  participationDates: "",
  contribution: "",
  status: "Onaylandı",
};

export default function FirmsPage() {
  const { tx } = useI18n();
  const { data, reload } = useApi<Company[]>("/api/companies");
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [accessId, setAccessId] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginName, setLoginName] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginNote, setLoginNote] = useState("");

  async function removeCompany(company: Company) {
    if (!confirm(tx("Bu firmayı listeden çıkarmak istiyor musunuz? Kurallar ve kayıtlar da silinir."))) return;
    setError("");
    try {
      await api(`/api/companies/${company.id}`, { method: "DELETE" });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : tx("Firma çıkarılamadı"));
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="display text-4xl">{tx("Private company & paydaşlar")}</h1>
      <p className="text-[#57534e]">{tx("UN, EBRD, EXIM Bank ve firmalar bu listeden yönetilir. Profil, kural ve katkılar firma sayfasındadır.")}</p>
      <form
        className="card p-4 grid md:grid-cols-4 gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await api("/api/companies", { method: "POST", body: JSON.stringify(form) });
            setForm(EMPTY);
            await reload();
          } catch (err) {
            setError(err instanceof Error ? err.message : tx("Firma eklenemedi"));
          } finally {
            setBusy(false);
          }
        }}
      >
        <input
          className="field md:col-span-2"
          required
          placeholder={tx("Kurum adı")}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <select className="field" value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })}>
          {SCOPES.map((scope) => (
            <option key={scope} value={scope}>{tx(scope)}</option>
          ))}
        </select>
        <select className="field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option value="Onaylandı">{tx("Onaylandı")}</option>
          <option value="Beklemede">{tx("Beklemede")}</option>
        </select>
        <input
          className="field"
          placeholder={tx("Konu")}
          value={form.topic}
          onChange={(e) => setForm({ ...form, topic: e.target.value })}
        />
        <input
          className="field"
          placeholder={tx("Katılım tarihleri")}
          value={form.participationDates}
          onChange={(e) => setForm({ ...form, participationDates: e.target.value })}
        />
        <input
          className="field md:col-span-2"
          placeholder={tx("Katkı")}
          value={form.contribution}
          onChange={(e) => setForm({ ...form, contribution: e.target.value })}
        />
        {error ? <p className="text-sm text-[#E31C23] md:col-span-4">{error}</p> : null}
        <button className="btn" disabled={busy}>{tx("Firma ekle")}</button>
      </form>
      <section className="card p-4 space-y-3">
        <h2 className="display text-2xl">{tx("Kullanıcı adı ve şifre")}</h2>
        <p className="text-sm text-[#57534e]">{tx("Paydaş bu e-posta ve şifreyle giriş yapar. Şifre en az 8 karakterdir. Boş bırakırsanız mevcut şifre değişmez.")}</p>
        <div className="grid md:grid-cols-4 gap-2">
          <label className="text-sm md:col-span-2">{tx("Kurum")}
            <select
              className="field mt-1"
              value={accessId}
              onChange={(e) => {
                const id = e.target.value;
                const company = (data || []).find((c) => c.id === id);
                const account = company?.users?.[0];
                setAccessId(id);
                setLoginEmail(account?.email || "");
                setLoginName(account?.name || "");
                setLoginPassword("");
                setLoginNote("");
              }}
            >
              <option value="">{tx("Kurum seçin")}</option>
              {(data || []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.users?.[0] ? ` · ${c.users[0].email}` : ` · ${tx("giriş yok")}`}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">{tx("Yetkili adı")}
            <input className="field mt-1" value={loginName} onChange={(e) => setLoginName(e.target.value)} />
          </label>
          <label className="text-sm">{tx("Kullanıcı adı (e-posta)")}
            <input className="field mt-1" type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
          </label>
          <label className="text-sm md:col-span-2">{tx("Yeni şifre")}
            <input className="field mt-1" type="text" autoComplete="off" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder={tx("En az 8 karakter")} />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              className="btn"
              disabled={!accessId || busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                setLoginNote("");
                try {
                  await api(`/api/companies/${accessId}/access`, {
                    method: "PUT",
                    body: JSON.stringify({ email: loginEmail, name: loginName, password: loginPassword }),
                  });
                  setLoginPassword("");
                  setLoginNote(tx("Giriş bilgisi kaydedildi."));
                  await reload();
                } catch (err) {
                  setError(err instanceof Error ? err.message : tx("Giriş bilgisi kaydedilemedi"));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {tx("Kaydet")}
            </button>
          </div>
        </div>
        {loginNote ? <p className="text-sm text-[#22A34A]">{loginNote}</p> : null}
        {error ? <p className="text-sm text-[#E31C23]">{error}</p> : null}
      </section>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>{tx("Firma")}</th>
              <th>{tx("Kapsam")}</th>
              <th>{tx("Konu")}</th>
              <th>{tx("Tarih")}</th>
              <th>{tx("Katkı")}</th>
              <th>{tx("Stant")}</th>
              <th>{tx("Durum")}</th>
              <th>{tx("Kurallar")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(data || []).map((c) => {
              const done = c.rules.filter((r) => r.status === "Tamamlandı").length;
              return (
                <tr key={c.id}>
                  <td><Link className="text-[#0077C2]" href={`/firmalar/${c.id}`}>{c.name}</Link></td>
                  <td>{c.scope}</td>
                  <td>{c.topic || "—"}</td>
                  <td>{c.participationDates}</td>
                  <td className="max-w-xs">{c.contribution}</td>
                  <td>{c.booth || "—"}</td>
                  <td><span className={`badge ${c.status === "Onaylandı" ? "ok" : "warn"}`}>{tx(c.status)}</span></td>
                  <td>{done}/{c.rules.length}</td>
                  <td>
                    <button
                      type="button"
                      className="btn ghost"
                      style={{ color: "#E31C23" }}
                      onClick={() => void removeCompany(c)}
                    >
                      {tx("Çıkar")}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
