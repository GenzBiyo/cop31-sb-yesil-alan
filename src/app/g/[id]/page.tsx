"use client";

import { use, useState } from "react";
import { api, useApi } from "@/lib/client";
import { useI18n } from "@/components/I18nProvider";
import { AgendaAlerts, rememberNotifyEmail } from "@/components/AgendaAlerts";
import { formatWhen } from "@/lib/agenda-time";

type Slot = {
  id: string;
  title: string;
  type: string;
  description: string;
  location: string;
  startTime: string;
  endTime: string;
  date: string;
  themeTr: string;
};

export default function AgendaSignupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <Form id={id} />;
}

function Form({ id }: { id: string }) {
  const { tx } = useI18n();
  const { data, error } = useApi<Slot>(`/api/public/agenda/${id}`);
  const [who, setWho] = useState({
    fullName: "",
    email: "",
    phone: "",
    organization: "",
    role: "katilimci",
  });
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      await api(`/api/public/agenda/${id}/signup`, {
        method: "POST",
        body: JSON.stringify(who),
      });
      rememberNotifyEmail(who.email);
      setDone(true);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : tx("Kayıt alınamadı"));
    }
  }

  if (!data && !error) return <p className="p-8">{tx("Yükleniyor…")}</p>;
  if (error || !data) {
    return (
      <main className="min-h-screen bg-[#EEF8FD] p-8">
        <p>{tx("Oturum bulunamadı.")}</p>
        <a className="text-[#0077C2] underline" href="/p">
          {tx("← Açık program")}
        </a>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#EEF8FD]">
      <AgendaAlerts publicMode />
      <header className="px-5 py-6 text-white" style={{ background: "#0088C8" }}>
        <a href="/p" className="text-xs underline opacity-80">
          {tx("← Açık program")}
        </a>
        <p className="text-xs tracking-[0.18em] uppercase mt-2 opacity-80">{tx(data.type)}</p>
        <h1 className="display text-4xl mt-1">{tx(data.title)}</h1>
        <p className="text-[#C8EEFA] mt-1">
          {formatWhen(data.date, data.startTime, data.endTime)} · {tx(data.location)}
        </p>
        <p className="text-sm mt-1 opacity-90">{tx(data.themeTr)}</p>
      </header>
      <div className="max-w-md mx-auto p-5">
        {done ? (
          <div className="card p-5 space-y-2">
            <h2 className="display text-3xl text-[#0077C2]">{tx("Kaydınız alındı")}</h2>
            <p className="text-sm">
              {tx("Etkinlik yaklaşınca veya saati değişince e-posta ve bu telefonda uyarı çıkar.")}
            </p>
            <a className="btn mt-3 inline-flex" href="/p">
              {tx("Programa dön")}
            </a>
          </div>
        ) : (
          <form className="card p-5 space-y-3" onSubmit={(e) => void submit(e)}>
            <p className="text-sm text-[#3E6A88]">{tx("QR kayıt: ad, telefon ve e-posta yeter.")}</p>
            <label className="text-sm">
              {tx("Ad soyad")}
              <input
                className="field mt-1"
                required
                value={who.fullName}
                onChange={(e) => setWho({ ...who, fullName: e.target.value })}
              />
            </label>
            <label className="text-sm">
              {tx("E-posta")}
              <input
                className="field mt-1"
                type="email"
                required
                value={who.email}
                onChange={(e) => setWho({ ...who, email: e.target.value })}
              />
            </label>
            <label className="text-sm">
              {tx("Telefon")}
              <input
                className="field mt-1"
                type="tel"
                required
                value={who.phone}
                onChange={(e) => setWho({ ...who, phone: e.target.value })}
              />
            </label>
            <label className="text-sm">
              {tx("Kurum")}
              <input
                className="field mt-1"
                value={who.organization}
                onChange={(e) => setWho({ ...who, organization: e.target.value })}
              />
            </label>
            <label className="text-sm flex items-center gap-2">
              <input
                type="checkbox"
                checked={who.role === "konusmaci"}
                onChange={(e) => setWho({ ...who, role: e.target.checked ? "konusmaci" : "katilimci" })}
              />
              {tx("Konuşmacı olarak kaydol")}
            </label>
            {err ? <p className="text-sm text-[#E31C23]">{err}</p> : null}
            <button className="btn w-full" type="submit">
              {tx("Kayıt ol")}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
