"use client";

import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/client";
import { DEMO_PASSWORD } from "@/lib/constants";
import { useI18n } from "@/components/I18nProvider";

export type DemoAccount = { role: string; email: string };

function GateLoginForm({
  heading,
  accounts,
}: {
  heading: string;
  accounts: DemoAccount[];
}) {
  const params = useSearchParams();
  const { tx } = useI18n();
  const [email, setEmail] = useState(accounts[0]?.email || "");
  const [password, setPassword] = useState(DEMO_PASSWORD);
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
      {accounts.length ? (
        <div className="pt-2 text-sm">
          <p className="text-[#57534e] mb-1">{tx("Demo · şifre")} <code>{DEMO_PASSWORD}</code></p>
          {accounts.map((a) => (
            <button
              type="button"
              key={a.email}
              className="w-full text-left px-2 py-1 hover:bg-[#EEF8FD]"
              onClick={() => {
                setEmail(a.email);
                setPassword(DEMO_PASSWORD);
              }}
            >
              <span className="text-[#0077C2]">{tx(a.role)}</span>
              <span className="block text-xs text-[#57534e]">{a.email}</span>
            </button>
          ))}
        </div>
      ) : null}
    </form>
  );
}

export function GateLogin(props: { heading: string; accounts: DemoAccount[] }) {
  return (
    <Suspense fallback={<p className="text-sm text-[#57534e]">…</p>}>
      <GateLoginForm {...props} />
    </Suspense>
  );
}
