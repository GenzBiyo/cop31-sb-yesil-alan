"use client";

import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, useApi } from "@/lib/client";
import { useI18n } from "@/components/I18nProvider";
import { AmbassadorForm } from "./AmbassadorForm";

type FormPayload = { registrationOpen?: boolean };

function AmbassadorHome() {
  const params = useSearchParams();
  const { tx } = useI18n();
  const { data } = useApi<FormPayload>("/api/ambassador/form");
  const initial = params.get("sekme") === "giris" ? "giris" : "kayit";
  const [tab, setTab] = useState<"kayit" | "giris">(initial);
  const loaded = Boolean(data);
  const open = data?.registrationOpen === true;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className={tab === "kayit" ? "btn justify-center" : "btn ghost justify-center"} onClick={() => setTab("kayit")}>
          {tx("Kayıt")}
        </button>
        <button type="button" className={tab === "giris" ? "btn justify-center" : "btn ghost justify-center"} onClick={() => setTab("giris")}>
          {tx("Giriş")}
        </button>
      </div>
      {tab === "kayit" ? (
        !loaded ? <p className="text-sm text-[#57534e]">…</p> : open ? <AmbassadorForm /> : (
          <div>
            <h2 className="display text-3xl">{tx("Kayıtlar doldu.")}</h2>
            <p className="mt-2 text-sm">{tx("Başvuru süresi 5 Ekim 2026 tarihinde kapandı.")}</p>
          </div>
        )
      ) : (
        <ElciLogin />
      )}
    </div>
  );
}

function ElciLogin() {
  const params = useSearchParams();
  const { tx } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/ambassador/login", { method: "POST", body: JSON.stringify({ email, password }) });
      const next = params.get("next");
      const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : "/elci/hediye";
      window.location.assign(dest);
    } catch (err) {
      setError(err instanceof Error ? err.message : tx("Giriş başarısız"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <p className="text-sm text-[#3E6A88]">{tx("Kabul edilen elçiler e-posta adresiyle giriş yapar.")}</p>
      <label className="block text-sm text-[#57534e]">{tx("E-posta")}
        <input className="field mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
      </label>
      <label className="block text-sm text-[#57534e]">{tx("Şifre")}
        <input className="field mt-1" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
      </label>
      {error ? <p className="text-sm text-[#0077C2]">{tx(error)}</p> : null}
      <button className="btn w-full justify-center" disabled={busy}>
        {busy ? tx("Giriş yapılıyor…") : tx("Giriş yap")}
      </button>
    </form>
  );
}

export function AmbassadorGate() {
  return (
    <Suspense fallback={<p className="text-sm text-[#57534e]">…</p>}>
      <AmbassadorHome />
    </Suspense>
  );
}
