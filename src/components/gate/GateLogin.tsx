"use client";

import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/client";
import { useI18n } from "@/components/I18nProvider";

function GateLoginForm({ heading }: { heading: string }) {
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
      await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      const next = params.get("next");
      const dest = next && next.startsWith("/") ? next : "/dashboard";
      window.location.assign(dest);
    } catch (err) {
      setError(err instanceof Error ? err.message : tx("Giriş başarısız"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <p className="text-xs tracking-[0.2em] uppercase text-[#0077C2]">{tx("Giriş")}</p>
      <h2 className="display text-3xl leading-tight">{tx(heading)}</h2>
      <label className="block text-sm text-[#57534e]">{tx("E-posta")}
        <input className="field mt-1" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
      </label>
      <label className="block text-sm text-[#57534e]">{tx("Şifre")}
        <input className="field mt-1" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
      </label>
      {error ? <p className="text-sm text-[#0077C2]">{tx(error)}</p> : null}
      <button className="btn w-full justify-center" disabled={busy}>
        {busy ? tx("Giriş yapılıyor…") : tx("Giriş yap")}
      </button>
    </form>
  );
}

export function GateLogin(props: { heading: string }) {
  return (
    <Suspense fallback={<p className="text-sm text-[#57534e]">…</p>}>
      <GateLoginForm {...props} />
    </Suspense>
  );
}
