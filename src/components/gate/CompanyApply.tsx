"use client";

import { FormEvent, useState } from "react";
import { api } from "@/lib/client";
import { useI18n } from "@/components/I18nProvider";

const SCOPES = ["Local", "Global", "Startup", "UN", "Diğer"];

export function CompanyApply({
  defaultScope = "Local",
  lockScope = false,
  title = "Hesap başvurusu",
  blurb = "Hesabınız admin onayından sonra açılır. Onay e-posta ile gelir.",
}: {
  defaultScope?: string;
  lockScope?: boolean;
  title?: string;
  blurb?: string;
}) {
  const [form, setForm] = useState({
    companyName: "",
    scope: defaultScope,
    name: "",
    title: lockScope ? "Startup yetkilisi" : "Firma yetkilisi",
    email: "",
    phone: "",
    password: "",
    topic: "",
    contribution: "",
    website: "",
    participationDates: "",
  });
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const { tx } = useI18n();

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/auth/register", { method: "POST", body: JSON.stringify(form) });
      setOk(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız");
    } finally {
      setBusy(false);
    }
  }

  if (ok) {
    return (
      <div>
        <h2 className="display text-3xl">{tx("Başvurunuz alındı")}</h2>
        <p className="mt-2 text-sm">{tx("Admin kuyruğuna düştü; onaylanınca giriş yapabilirsiniz.")}</p>
      </div>
    );
  }

  return (
    <form className="grid gap-3" onSubmit={onSubmit}>
      <div>
        <p className="text-xs tracking-[0.2em] uppercase text-[#0077C2]">{tx("Kayıt")}</p>
        <h2 className="display text-3xl leading-tight">{tx(title)}</h2>
        <p className="text-sm text-[#57534e] mt-1">{tx(blurb)}</p>
      </div>
      <label className="text-sm">{tx("Kurum adı *")}
        <input className="field mt-1" required value={form.companyName} onChange={(e) => set("companyName", e.target.value)} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-sm">{tx("Kapsam")}
          <select className="field mt-1" value={form.scope} disabled={lockScope} onChange={(e) => set("scope", e.target.value)}>
            {SCOPES.map((s) => <option key={s}>{tx(s)}</option>)}
          </select>
        </label>
        <label className="text-sm">{tx("Katılım")}
          <input className="field mt-1" placeholder={tx("ör. 9–12 Kasım")} value={form.participationDates} onChange={(e) => set("participationDates", e.target.value)} />
        </label>
      </div>
      <label className="text-sm">{tx("Yetkili adı *")}
        <input className="field mt-1" required value={form.name} onChange={(e) => set("name", e.target.value)} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-sm">{tx("E-posta")} *
          <input className="field mt-1" type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} />
        </label>
        <label className="text-sm">{tx("Telefon")} *
          <input className="field mt-1" required value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </label>
      </div>
      <label className="text-sm">{tx("Şifre")} * (8+)
        <input className="field mt-1" type="password" required minLength={8} value={form.password} onChange={(e) => set("password", e.target.value)} />
      </label>
      <label className="text-sm">{tx("İklim-sağlık katkınız")}
        <textarea className="field mt-1" rows={3} value={form.contribution} onChange={(e) => set("contribution", e.target.value)} placeholder={tx("Karbon azaltımı, koruyucu sağlık, sıfır atık…")} />
      </label>
      {error ? <p className="text-sm text-[#0077C2]">{tx(error)}</p> : null}
      <button className="btn justify-center" disabled={busy}>{busy ? tx("Gönderiliyor…") : tx("Başvuruyu gönder")}</button>
    </form>
  );
}
