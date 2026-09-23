"use client";

import { useMemo, useState } from "react";
import { api, useApi, useRealtime } from "@/lib/client";
import { useI18n } from "@/components/I18nProvider";

type Account = {
  id: string;
  name: string;
  email: string;
  phone: string;
  title: string;
  accountStatus: string;
  createdAt: string;
  company: {
    id: string;
    name: string;
    scope: string;
    topic: string;
    contribution: string;
    status: string;
    website: string;
  } | null;
};

export default function AccountsPage() {
  const { tx } = useI18n();
  const { data, reload } = useApi<Account[]>("/api/auth/accounts");
  const [filter, setFilter] = useState("Beklemede");
  const [message, setMessage] = useState("");
  const [info, setInfo] = useState("");

  useRealtime((t) => {
    if (t === "account" || t === "inbox") void reload();
  });

  const rows = useMemo(() => {
    const list = data || [];
    if (filter === "Tümü") return list;
    return list.filter((a) => a.accountStatus === filter);
  }, [data, filter]);

  async function decide(id: string, accountStatus: string) {
    await api("/api/auth/accounts", {
      method: "PATCH",
      body: JSON.stringify({ id, accountStatus, message: message || undefined }),
    });
    setInfo(`Durum güncellendi: ${accountStatus}. Firma e-posta ile bilgilendirildi.`);
    setMessage("");
    await reload();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="display text-4xl">{tx("Firma hesap onayları")}</h1>
        <p className="text-[#57534e]">{tx("Self-servis kayıtlar buraya düşer. Onaylanan hesap giriş yapabilir; standart pavilon kuralları atanır.")}</p>
      </div>
      {info ? <p className="text-sm text-[#22A34A]">{tx(info)}</p> : null}
      <div className="flex flex-wrap gap-2">
        {["Beklemede", "Onaylandı", "Reddedildi", "Tümü"].map((s) => (
          <button key={s} className={filter === s ? "btn" : "btn ghost"} onClick={() => setFilter(s)}>{tx(s)}</button>
        ))}
      </div>
      <label className="text-sm block">{tx("Onay / red mesajı (opsiyonel)")}
        <textarea className="field mt-1" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={tx("Firmaya gidecek özel metin")} />
      </label>
      <div className="space-y-3">
        {rows.map((a) => (
          <div key={a.id} className="card p-4">
            <div className="flex justify-between gap-3 flex-wrap">
              <div>
                <div className="display text-2xl">{a.company?.name || tx("Firma")}</div>
                <div className="text-sm">{a.name} · {a.title}</div>
                <div className="text-xs text-[#57534e]">{a.email} · {a.phone}</div>
                <div className="text-sm mt-2">{tx(a.company?.scope || "")} · {a.company?.topic || tx("konu yok")}</div>
                <div className="text-sm text-[#57534e]">{a.company?.contribution}</div>
              </div>
              <span className={`badge h-fit ${a.accountStatus === "Onaylandı" ? "ok" : a.accountStatus === "Reddedildi" ? "high" : "warn"}`}>
                {tx(a.accountStatus)}
              </span>
            </div>
            {a.accountStatus === "Beklemede" ? (
              <div className="flex gap-2 mt-3">
                <button className="btn" onClick={() => decide(a.id, "Onaylandı")}>{tx("Onayla ve bildir")}</button>
                <button className="btn ghost" onClick={() => decide(a.id, "Reddedildi")}>{tx("Reddet ve bildir")}</button>
              </div>
            ) : null}
          </div>
        ))}
        {rows.length === 0 ? <p className="text-sm text-[#57534e]">{tx("Bu filtrede hesap yok.")}</p> : null}
      </div>
    </div>
  );
}
