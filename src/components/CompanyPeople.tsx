"use client";

import Link from "next/link";
import { useState } from "react";
import { Mic, Plus, Trash2, UserPlus } from "lucide-react";
import { api, useApi } from "@/lib/client";
import { useI18n } from "@/components/I18nProvider";
import { DELEGATE_DUTIES, MAX_DELEGATES, parseDelegation, type Delegate } from "@/lib/delegation";

export type FormHint = { companyName: string; days: string[]; headcount: number; speakers: { name: string; title: string }[] };

type CompanyRef = { id: string; name: string; delegation: string; formHint?: FormHint | null };
type OwnSpeaker = { id: string; name: string; title: string; status: string };

const BLANK: Delegate = { name: "", title: "", duty: "", email: "", phone: "" };
const SPEAKING = /konuşmacı|panelist|moderat/i;

export function DelegationEditor({ company, reload }: { company: CompanyRef; reload: () => Promise<void> }) {
  const { tx } = useI18n();
  const saved = parseDelegation(company.delegation);
  const [rows, setRows] = useState<Delegate[]>(() => (saved.length ? saved : [{ ...BLANK }]));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
    const filled = rows.filter((r) => r.name.trim());
    const dirty = JSON.stringify(filled) !== JSON.stringify(saved);
    const missingRole = filled.find((r) => !r.title.trim() || !r.duty.trim());
  const headcount = company.formHint?.headcount || 0;

  function patch(i: number, part: Partial<Delegate>) {
    setRows(rows.map((r, idx) => (idx === i ? { ...r, ...part } : r)));
  }

  async function save() {
    setMsg("");
    setError("");
    if (missingRole) {
      setError(tx("Her kişi için unvan ve pavilyondaki görevi yazın."));
      return;
    }
    setBusy(true);
    try {
      await api(`/api/companies/${company.id}`, { method: "PATCH", body: JSON.stringify({ delegation: filled }) });
      await reload();
      setMsg(`${tx("Kaydedildi")} · ${filled.length} ${tx("kişi")}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : tx("Kaydedilemedi"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-4 space-y-3">
      <div>
        <h2 className="display text-2xl">{tx("Kurum adına katılacak kişiler")}</h2>
        <p className="text-sm text-[#57534e]">
          {tx("Pavilyona kurumunuz adına katılacak herkesi unvanı ve pavilyondaki göreviyle ekleyin. Bu liste giriş, yaka kartı ve oturum planlamasında kullanılır.")}
        </p>
        {headcount ? (
          <p className="text-xs text-[#0077C2] mt-1">
            {tx("Paydaş formunda")} {headcount} {tx("kişi katılacağını bildirdiniz")} · {tx("şu an listede")} {filled.length}.
          </p>
        ) : null}
      </div>
      <datalist id="delegate-duties">
        {DELEGATE_DUTIES.map((d) => <option key={d} value={tx(d)} />)}
      </datalist>
      <div className="space-y-2">
        <div className="hidden md:grid md:grid-cols-[1.2fr_1.2fr_1fr_1.1fr_0.8fr_auto] gap-2 text-xs text-[#57534e]">
          <span>{tx("Ad soyad")} *</span>
          <span>{tx("Unvan")} *</span>
          <span>{tx("Görev")} *</span>
          <span>{tx("E-posta")}</span>
          <span>{tx("Telefon")}</span>
          <span />
        </div>
        {rows.map((r, i) => (
          <div key={i} className="grid gap-2 md:grid-cols-[1.2fr_1.2fr_1fr_1.1fr_0.8fr_auto] items-center border-b border-[#DCE8F0] pb-2 md:border-0 md:pb-0">
            <input className="field" placeholder={tx("Ad soyad")} value={r.name} onChange={(e) => patch(i, { name: e.target.value })} />
            <input className="field" placeholder={tx("Unvan (örn. Medikal Direktör)")} value={r.title} onChange={(e) => patch(i, { title: e.target.value })} />
            <input className="field" list="delegate-duties" placeholder={tx("Görev (örn. Konuşmacı)")} value={r.duty} onChange={(e) => patch(i, { duty: e.target.value })} />
            <input className="field" type="email" placeholder={tx("E-posta")} value={r.email} onChange={(e) => patch(i, { email: e.target.value })} />
            <input className="field" type="tel" placeholder={tx("Telefon")} value={r.phone} onChange={(e) => patch(i, { phone: e.target.value })} />
            <button type="button" className="btn ghost px-2" aria-label={tx("Sil")} onClick={() => setRows(rows.length > 1 ? rows.filter((_, idx) => idx !== i) : [{ ...BLANK }])}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn ghost" disabled={rows.length >= MAX_DELEGATES} onClick={() => setRows([...rows, { ...BLANK }])}>
          <Plus size={14} />{tx("Kişi ekle")}
        </button>
        <button type="button" className="btn" disabled={busy || !dirty} onClick={() => void save()}>
          {busy ? tx("Kaydediliyor…") : tx("Listeyi kaydet")}
        </button>
        {msg ? <span className="text-sm text-[#22A34A]">{msg}</span> : null}
        {error ? <span className="text-sm text-[#E31C23]">{error}</span> : null}
      </div>
    </section>
  );
}

export function SpeakerRequest({ company }: { company: CompanyRef }) {
  const { tx } = useI18n();
  const { data, reload } = useApi<{ speakers: OwnSpeaker[] }>("/api/speakers");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const speakers = data?.speakers || [];
  const known = new Set(speakers.map((s) => s.name.toLocaleLowerCase("tr")));
  const suggestions = [
    ...(company.formHint?.speakers || []),
    ...parseDelegation(company.delegation).filter((d) => SPEAKING.test(d.duty)),
  ].filter((p, i, all) => {
    const key = p.name.toLocaleLowerCase("tr");
    return !known.has(key) && all.findIndex((q) => q.name.toLocaleLowerCase("tr") === key) === i;
  });

  async function propose(p: { name: string; title: string }) {
    setBusy(p.name);
    setError("");
    try {
      const body = new FormData();
      body.set("name", p.name);
      body.set("title", p.title);
      body.set("organization", company.name);
      await api("/api/speakers", { method: "POST", body });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : tx("Kayıt alınamadı"));
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="card p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="display text-2xl flex items-center gap-2"><Mic size={20} className="text-[#0077C2]" />{tx("Konuşmacılarınız")}</h2>
          <p className="text-sm text-[#57534e]">
            {tx("Pavilyonda kurumunuz adına konuşma yapacak kişiler kimler? Konuşmacılarınızı ekleyin; yer aldığınız panel ve sunumlarda konuşma başlıklarını da girebilirsiniz.")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="btn" href="/konusmaci-yonetimi"><UserPlus size={15} />{tx("Konuşmacı ekle")}</Link>
          <Link className="btn ghost" href="/paneller">{tx("Panellerim")}</Link>
          <Link className="btn ghost" href="/sunumlar">{tx("Sunumlarım")}</Link>
        </div>
      </div>
      {speakers.length ? (
        <ul className="flex flex-wrap gap-2">
          {speakers.map((s) => (
            <li key={s.id} className="border border-[#DCE8F0] px-2 py-1 text-sm">
              <b>{s.name}</b>{s.title ? ` · ${s.title}` : ""}{" "}
              <span className={`badge ${s.status === "Onaylandı" ? "ok" : s.status === "Reddedildi" ? "high" : "warn"}`}>{tx(s.status)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[#c2410c]">{tx("Henüz konuşmacı bildirmediniz.")}</p>
      )}
      {suggestions.length ? (
        <div className="border border-[#B5DFF2] bg-[#F2F9FD] p-3 space-y-2">
          <div className="text-sm font-semibold">{tx("Bu kişiler konuşmacınız mı?")}</div>
          <p className="text-xs text-[#57534e]">{tx("Paydaş formunda veya katılımcı listenizde konuşmacı olarak geçiyorlar. Tek tıkla Sağlık Bakanlığı onayına gönderin; fotoğraf ve özgeçmişi sonra ekleyebilirsiniz.")}</p>
          <ul className="space-y-1">
            {suggestions.map((p) => (
              <li key={p.name} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span><b>{p.name}</b>{p.title ? ` · ${p.title}` : ""}</span>
                <button type="button" className="btn ghost" disabled={busy === p.name} onClick={() => void propose(p)}>
                  {busy === p.name ? tx("Gönderiliyor…") : tx("Konuşmacı olarak öner")}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {error ? <p className="text-sm text-[#E31C23]">{error}</p> : null}
    </section>
  );
}
