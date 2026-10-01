"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarDays, Check, KeyRound, Pause, Pencil, Play, Plus, X } from "lucide-react";
import { api, formatDate, useApi, useRealtime } from "@/lib/client";
import { useI18n } from "@/components/I18nProvider";
import { ACCOUNT_KINDS, accountKind } from "@/lib/account-kinds";

type Account = {
  id: string;
  name: string;
  email: string;
  phone: string;
  title: string;
  role: "ADMIN" | "SAGLIK" | "FIRMA";
  accountStatus: string;
  createdAt: string;
  companyId: string | null;
  company: {
    id: string;
    name: string;
    kind: string;
    status: string;
    participationDates: string;
    booth: string;
    scope: string;
    topic: string;
    contribution: string;
    website: string;
  } | null;
};

const STATUS_TABS = [
  { id: "Beklemede", label: "Onay bekleyen" },
  { id: "Onaylandı", label: "Aktif" },
  { id: "Askıda", label: "Askıda" },
  { id: "Reddedildi", label: "Reddedildi" },
  { id: "Tümü", label: "Tümü" },
];

const BADGE: Record<string, string> = { Beklemede: "warn", Onaylandı: "ok", Reddedildi: "high", Askıda: "muted" };

const EMPTY_NEW = { role: "FIRMA", kind: "firma", orgName: "", name: "", title: "", email: "", phone: "", participationDates: "", password: "" };

function typeLabel(a: Account) {
  if (a.role === "ADMIN") return "Admin";
  if (a.role === "SAGLIK") return "Sağlık Bakanlığı";
  return accountKind(a.company?.kind).label;
}

export default function UserAdminPage() {
  const { tx } = useI18n();
  const { data, reload } = useApi<{ users: Account[] }>("/api/admin/users");
  const { data: me } = useApi<{ id: string }>("/api/auth/me");
  const [status, setStatus] = useState("Beklemede");
  const [type, setType] = useState("all");
  const [q, setQ] = useState("");
  const [message, setMessage] = useState("");
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [secret, setSecret] = useState<{ email: string; password: string } | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [draft, setDraft] = useState(EMPTY_NEW);
  const [editId, setEditId] = useState("");
  const [edit, setEdit] = useState<Record<string, string>>({});

  useRealtime((t) => {
    if (t === "account" || t === "inbox") void reload();
  });

  const users = useMemo(() => data?.users || [], [data]);
  const counts = useMemo(
    () => ({
      pending: users.filter((u) => u.accountStatus === "Beklemede").length,
      special: users.filter((u) => u.role === "FIRMA" && u.accountStatus === "Onaylandı").length,
      staff: users.filter((u) => u.role !== "FIRMA").length,
      paused: users.filter((u) => u.accountStatus === "Askıda").length,
    }),
    [users]
  );

  const rows = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase("tr-TR");
    return users
      .filter((u) => status === "Tümü" || u.accountStatus === status)
      .filter((u) => (type === "all" ? true : type === "staff" ? u.role !== "FIRMA" : u.role === "FIRMA" && (u.company?.kind || "firma") === type))
      .filter((u) => !needle || [u.name, u.email, u.company?.name, u.title].join(" ").toLocaleLowerCase("tr-TR").includes(needle));
  }, [users, status, type, q]);

  async function run(fn: () => Promise<void>, ok: string) {
    setError("");
    setInfo("");
    try {
      await fn();
      setInfo(ok);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : tx("İşlem yapılamadı"));
    }
  }

  function setAccountStatus(a: Account, accountStatus: string) {
    return run(async () => {
      await api(`/api/admin/users/${a.id}`, { method: "PATCH", body: JSON.stringify({ accountStatus, message: message || undefined }) });
      setMessage("");
    }, `${a.name}: ${tx(accountStatus)}`);
  }

  function resetPassword(a: Account) {
    if (!confirm(tx("Bu kullanıcı için yeni geçici şifre oluşturulsun mu?"))) return;
    return run(async () => {
      const res = await api<{ password?: string }>(`/api/admin/users/${a.id}`, { method: "PATCH", body: JSON.stringify({ resetPassword: true }) });
      if (res.password) setSecret({ email: a.email, password: res.password });
    }, tx("Yeni şifre oluşturuldu."));
  }

  function openEdit(a: Account) {
    setEditId(a.id);
    setEdit({
      name: a.name,
      title: a.title,
      phone: a.phone,
      email: a.email,
      role: a.role,
      kind: a.company?.kind || "firma",
      orgName: a.company?.name || "",
      participationDates: a.company?.participationDates || "",
    });
  }

  function saveEdit(a: Account) {
    const body: Record<string, string> = { name: edit.name, title: edit.title, phone: edit.phone, email: edit.email };
    if (a.role === "FIRMA") Object.assign(body, { kind: edit.kind, orgName: edit.orgName, participationDates: edit.participationDates });
    else if (edit.role !== a.role) body.role = edit.role;
    return run(async () => {
      await api(`/api/admin/users/${a.id}`, { method: "PATCH", body: JSON.stringify(body) });
      setEditId("");
    }, tx("Hesap güncellendi."));
  }

  function create(e: React.FormEvent) {
    e.preventDefault();
    return run(async () => {
      const res = await api<{ password: string; user: Account }>("/api/admin/users", { method: "POST", body: JSON.stringify(draft) });
      setSecret({ email: res.user.email, password: res.password });
      setDraft(EMPTY_NEW);
      setShowNew(false);
      setStatus("Onaylandı");
    }, tx("Hesap açıldı ve onaylandı."));
  }

  if (!data || !me) return <p>{tx("Yükleniyor…")}</p>;
  const newKind = accountKind(draft.kind);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="display text-4xl">{tx("Kullanıcı yönetimi")}</h1>
          <p className="text-[#57534e]">
            {tx("Firma, startup, kamu kurumu, konuşmacı, STK ve akademi hesaplarının onayı burada. Onaylı özellikli hesaplar toplantı isteyebilir, gelen talepleri kabul edebilir ve takvimlerini yönetebilir.")}
          </p>
        </div>
        <button type="button" className={showNew ? "btn ghost" : "btn"} onClick={() => setShowNew((v) => !v)}>
          {showNew ? <X size={16} /> : <Plus size={16} />}
          {showNew ? tx("Formu kapat") : tx("Yeni hesap ekle")}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ["Onay bekleyen", counts.pending, "#F5A623"],
          ["Aktif özellikli hesap", counts.special, "#32C45A"],
          ["Admin / SB kullanıcısı", counts.staff, "#0077C2"],
          ["Askıda", counts.paused, "#8A9AA8"],
        ].map(([k, v, c]) => (
          <div key={String(k)} className="card p-3" style={{ borderLeft: `4px solid ${c}` }}>
            <div className="text-xs uppercase tracking-[0.12em] text-[#3E6A88]">{tx(String(k))}</div>
            <div className="display text-3xl text-[#0077C2]">{v}</div>
          </div>
        ))}
      </div>

      {info ? <p className="text-sm text-[#22A34A]">{info}</p> : null}
      {error ? <p className="text-sm text-[#E31C23]">{error}</p> : null}
      {secret ? (
        <div className="card p-3 border-l-4 border-[#F5A623] text-sm flex flex-wrap items-center justify-between gap-2">
          <span>
            {tx("Giriş bilgisi")}: <b>{secret.email}</b> · {tx("Şifre")}: <code className="bg-[#FFF8EC] px-1">{secret.password}</code>
            <span className="text-[#57534e]"> — {tx("Bu şifre yalnızca şimdi gösterilir; kullanıcıya güvenli bir kanaldan iletin.")}</span>
          </span>
          <button type="button" className="btn ghost" onClick={() => setSecret(null)}>{tx("Kapat")}</button>
        </div>
      ) : null}

      {showNew ? (
        <form className="card p-4 grid md:grid-cols-3 gap-2" onSubmit={create}>
          <label className="text-sm">{tx("Hesap tipi")}
            <select className="field mt-1" value={draft.role === "FIRMA" ? draft.kind : draft.role} onChange={(e) => {
              const v = e.target.value;
              setDraft({ ...draft, role: v === "ADMIN" || v === "SAGLIK" ? v : "FIRMA", kind: v === "ADMIN" || v === "SAGLIK" ? draft.kind : v });
            }}>
              {ACCOUNT_KINDS.map((k) => <option key={k.id} value={k.id}>{tx(k.label)}</option>)}
              <option value="SAGLIK">{tx("Sağlık Bakanlığı kullanıcısı")}</option>
              <option value="ADMIN">{tx("Admin")}</option>
            </select>
          </label>
          {draft.role === "FIRMA" ? (
            <label className="text-sm">{tx(newKind.orgLabel)}{newKind.id === "konusmaci" ? "" : " *"}
              <input className="field mt-1" required={newKind.id !== "konusmaci"} value={draft.orgName} onChange={(e) => setDraft({ ...draft, orgName: e.target.value })} />
            </label>
          ) : <div />}
          {draft.role === "FIRMA" ? (
            <label className="text-sm">{tx("Katılım günleri")}
              <input className="field mt-1" placeholder={tx("ör. 9–12 Kasım")} value={draft.participationDates} onChange={(e) => setDraft({ ...draft, participationDates: e.target.value })} />
            </label>
          ) : <div />}
          <label className="text-sm">{tx("Ad soyad")} *
            <input className="field mt-1" required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </label>
          <label className="text-sm">{tx("Unvan / görev")}
            <input className="field mt-1" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </label>
          <label className="text-sm">{tx("Telefon")}
            <input className="field mt-1" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
          </label>
          <label className="text-sm">{tx("E-posta")} *
            <input className="field mt-1" type="email" required value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
          </label>
          <label className="text-sm">{tx("Şifre")}
            <input className="field mt-1" placeholder={tx("Boş bırakılırsa otomatik oluşturulur")} value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} />
          </label>
          <div className="flex items-end">
            <button className="btn">{tx("Hesabı aç")}</button>
          </div>
        </form>
      ) : null}

      <div className="flex flex-wrap gap-2 items-center">
        {STATUS_TABS.map((s) => (
          <button key={s.id} type="button" className={status === s.id ? "btn" : "btn ghost"} onClick={() => setStatus(s.id)}>
            {tx(s.label)}{s.id === "Beklemede" && counts.pending ? ` (${counts.pending})` : ""}
          </button>
        ))}
        <select className="field w-56" value={type} onChange={(e) => setType(e.target.value)} aria-label={tx("Hesap tipi")}>
          <option value="all">{tx("Tüm hesap tipleri")}</option>
          {ACCOUNT_KINDS.map((k) => <option key={k.id} value={k.id}>{tx(k.label)}</option>)}
          <option value="staff">{tx("Admin / SB kullanıcıları")}</option>
        </select>
        <input className="field w-60" placeholder={tx("Ad, e-posta veya kurum ara")} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {status === "Beklemede" && rows.length ? (
        <label className="text-sm block">{tx("Onay / red mesajı (isteğe bağlı)")}
          <textarea className="field mt-1" rows={2} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={tx("Kullanıcıya gidecek özel metin")} />
        </label>
      ) : null}

      <div className="space-y-2">
        {rows.map((a) => {
          const isSelf = a.id === me.id;
          return (
            <div key={a.id} className="card p-4">
              <div className="flex flex-wrap justify-between gap-3">
                <div className="min-w-[240px] flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="badge muted">{tx(typeLabel(a))}</span>
                    <span className={`badge ${BADGE[a.accountStatus] || ""}`}>{tx(a.accountStatus === "Beklemede" ? "Onay bekliyor" : a.accountStatus === "Onaylandı" ? "Aktif" : a.accountStatus)}</span>
                    {isSelf ? <span className="badge">{tx("Siz")}</span> : null}
                  </div>
                  <div className="display text-2xl mt-1">{a.company?.name || a.name}</div>
                  <div className="text-sm">{a.name}{a.title ? ` · ${a.title}` : ""}</div>
                  <div className="text-xs text-[#57534e]">{[a.email, a.phone].filter(Boolean).join(" · ")} · {tx("Kayıt")} {formatDate(a.createdAt)}</div>
                  {a.company ? (
                    <div className="text-xs text-[#57534e] mt-1">
                      {[a.company.participationDates && `${tx("Katılım")}: ${a.company.participationDates}`, a.company.topic, a.company.contribution].filter(Boolean).join(" · ")}
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2 items-start">
                  {a.accountStatus === "Beklemede" ? (
                    <>
                      <button type="button" className="btn" onClick={() => void setAccountStatus(a, "Onaylandı")}><Check size={14} />{tx("Onayla")}</button>
                      <button type="button" className="btn ghost" onClick={() => void setAccountStatus(a, "Reddedildi")}><X size={14} />{tx("Reddet")}</button>
                    </>
                  ) : null}
                  {a.accountStatus === "Onaylandı" && !isSelf ? (
                    <button type="button" className="btn ghost" onClick={() => confirm(tx("Hesap askıya alınsın mı? Kullanıcı giriş yapamaz.")) && void setAccountStatus(a, "Askıda")}>
                      <Pause size={14} />{tx("Askıya al")}
                    </button>
                  ) : null}
                  {a.accountStatus === "Askıda" || a.accountStatus === "Reddedildi" ? (
                    <button type="button" className="btn ghost" onClick={() => void setAccountStatus(a, "Onaylandı")}><Play size={14} />{tx("Aktifleştir")}</button>
                  ) : null}
                  {a.role === "FIRMA" && a.companyId && a.accountStatus === "Onaylandı" ? (
                    <Link className="btn ghost" href={`/takvimim?companyId=${a.companyId}`}><CalendarDays size={14} />{tx("Takvim")}</Link>
                  ) : null}
                  <button type="button" className="btn ghost" onClick={() => (editId === a.id ? setEditId("") : openEdit(a))} title={tx("Düzenle")}><Pencil size={14} /></button>
                  <button type="button" className="btn ghost" onClick={() => void resetPassword(a)} title={tx("Şifre sıfırla")}><KeyRound size={14} /></button>
                </div>
              </div>
              {editId === a.id ? (
                <div className="mt-3 border-t border-[#DCE8F0] pt-3 grid md:grid-cols-4 gap-2">
                  {a.role === "FIRMA" ? (
                    <>
                      <label className="text-sm">{tx("Hesap türü")}
                        <select className="field mt-1" value={edit.kind} onChange={(e) => setEdit({ ...edit, kind: e.target.value })}>
                          {ACCOUNT_KINDS.map((k) => <option key={k.id} value={k.id}>{tx(k.label)}</option>)}
                        </select>
                      </label>
                      <label className="text-sm">{tx("Kurum / hesap adı")}
                        <input className="field mt-1" value={edit.orgName} onChange={(e) => setEdit({ ...edit, orgName: e.target.value })} />
                      </label>
                      <label className="text-sm">{tx("Katılım günleri")}
                        <input className="field mt-1" value={edit.participationDates} onChange={(e) => setEdit({ ...edit, participationDates: e.target.value })} />
                      </label>
                      <div />
                    </>
                  ) : (
                    <label className="text-sm">{tx("Rol")}
                      <select className="field mt-1" value={edit.role} disabled={isSelf} onChange={(e) => setEdit({ ...edit, role: e.target.value })}>
                        <option value="SAGLIK">{tx("Sağlık Bakanlığı")}</option>
                        <option value="ADMIN">{tx("Admin")}</option>
                      </select>
                    </label>
                  )}
                  <label className="text-sm">{tx("Ad soyad")}
                    <input className="field mt-1" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
                  </label>
                  <label className="text-sm">{tx("Unvan / görev")}
                    <input className="field mt-1" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
                  </label>
                  <label className="text-sm">{tx("Telefon")}
                    <input className="field mt-1" value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} />
                  </label>
                  <label className="text-sm">{tx("E-posta")}
                    <input className="field mt-1" type="email" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} />
                  </label>
                  <div className="md:col-span-4 flex gap-2">
                    <button type="button" className="btn" onClick={() => void saveEdit(a)}>{tx("Kaydet")}</button>
                    <button type="button" className="btn ghost" onClick={() => setEditId("")}>{tx("Vazgeç")}</button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
        {rows.length === 0 ? <p className="text-sm text-[#57534e]">{tx("Bu filtrede hesap yok.")}</p> : null}
      </div>
    </div>
  );
}
