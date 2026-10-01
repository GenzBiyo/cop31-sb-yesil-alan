"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, ExternalLink, Pencil, Plus, Trash2, X } from "lucide-react";
import { api, useApi, useRealtime } from "@/lib/client";
import { useI18n } from "@/components/I18nProvider";
import { SpeakerAvatar } from "@/components/speakers";
import { fitSpeakerPhoto } from "@/lib/photo-fit";

type Speaker = {
  id: string;
  name: string;
  title: string;
  organization: string;
  summary: string;
  bio: string;
  linkedin: string;
  photoPath: string;
  companyId: string;
  status: string;
  reviewNote: string;
  active: boolean;
  sortOrder: number;
};

const BADGE: Record<string, string> = {
  "Onay bekliyor": "warn",
  Onaylandı: "ok",
  Reddedildi: "high",
};

const EMPTY = { name: "", title: "", organization: "", summary: "", bio: "", linkedin: "" };

export default function SpeakerAdminPage() {
  const { tx } = useI18n();
  const { data, reload } = useApi<{ speakers: Speaker[] }>("/api/speakers");
  const { data: me } = useApi<{ role: string }>("/api/auth/me");
  const manager = me?.role === "ADMIN" || me?.role === "SAGLIK";
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Speaker | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [removePhoto, setRemovePhoto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});

  useRealtime((t) => {
    if (t === "agenda") void reload();
  });

  useEffect(() => {
    if (!photo) return;
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const speakers = data?.speakers || [];
  const pending = speakers.filter((s) => s.status === "Onay bekliyor");
  const rest = manager ? speakers.filter((s) => s.status !== "Onay bekliyor") : speakers;

  function openNew() {
    setEditing(null);
    setForm(EMPTY);
    setPhoto(null);
    setPreview("");
    setRemovePhoto(false);
    setShowForm(true);
  }

  function openEdit(s: Speaker) {
    setEditing(s);
    setForm({ name: s.name, title: s.title, organization: s.organization, summary: s.summary, bio: s.bio, linkedin: s.linkedin });
    setPhoto(null);
    setPreview(s.photoPath);
    setRemovePhoto(false);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }

  async function pickPhoto(file: File | undefined) {
    setError("");
    if (!file) return;
    try {
      setPhoto(await fitSpeakerPhoto(file));
      setRemovePhoto(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : tx("Fotoğraf işlenemedi"));
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const body = new FormData();
      for (const [k, v] of Object.entries(form)) body.set(k, v);
      if (photo) body.set("photo", photo);
      if (removePhoto) body.set("removePhoto", "1");
      if (editing) {
        await api(`/api/speakers/${editing.id}`, { method: "PATCH", body });
        setInfo(tx("Konuşmacı güncellendi."));
      } else {
        await api("/api/speakers", { method: "POST", body });
        setInfo(manager ? tx("Konuşmacı eklendi.") : tx("Konuşmacınız Sağlık Bakanlığı onayına gönderildi."));
      }
      closeForm();
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : tx("Kayıt alınamadı"));
    } finally {
      setBusy(false);
    }
  }

  async function patch(s: Speaker, body: Record<string, unknown>) {
    setError("");
    try {
      await api(`/api/speakers/${s.id}`, { method: "PATCH", body: JSON.stringify(body) });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : tx("İşlem yapılamadı"));
    }
  }

  async function remove(s: Speaker) {
    if (!confirm(tx("Bu konuşmacı silinsin mi?"))) return;
    await api(`/api/speakers/${s.id}`, { method: "DELETE" });
    await reload();
  }

  if (!me || !data) return <p>{tx("Yükleniyor…")}</p>;

  const canEdit = (s: Speaker) => manager || s.status === "Onay bekliyor";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="display text-4xl">{tx("Konuşmacılar")}</h1>
          <p className="text-[#57534e]">
            {manager
              ? tx("Konuşmacıları ekleyin, düzenleyin, sıralayın ve firma önerilerini onaylayın. Onaylı ve bantta gösterilen konuşmacılar ana sayfada döner.")
              : tx("Konuşmacınızı fotoğraf, kurum, özet, özgeçmiş ve LinkedIn bilgisiyle ekleyin. Sağlık Bakanlığı onaylayınca yayınlanır.")}
          </p>
          <Link className="text-sm text-[#0077C2] underline" href="/konusmacilar" target="_blank">
            {tx("Herkese açık konuşmacılar sayfası")}
          </Link>
        </div>
        <button type="button" className={showForm ? "btn ghost" : "btn"} onClick={() => (showForm ? closeForm() : openNew())}>
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? tx("Formu kapat") : tx("Yeni konuşmacı ekle")}
        </button>
      </div>

      {info ? <p className="text-sm text-[#22A34A]">{info}</p> : null}
      {error ? <p className="text-sm text-[#E31C23]">{error}</p> : null}

      {showForm ? (
        <form className="card p-4 grid md:grid-cols-[180px_1fr] gap-4" onSubmit={submit}>
          <div className="space-y-2">
            <SpeakerAvatar name={form.name || "?"} photoPath={removePhoto ? "" : preview} size={160} />
            <label className="btn ghost text-sm cursor-pointer">
              {tx("Fotoğraf seç")}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => void pickPhoto(e.target.files?.[0])} />
            </label>
            {preview && !removePhoto ? (
              <button type="button" className="text-xs text-[#E31C23] underline block" onClick={() => { setPhoto(null); setPreview(""); setRemovePhoto(true); }}>
                {tx("Fotoğrafı kaldır")}
              </button>
            ) : null}
            <p className="text-xs text-[#57534e]">{tx("Fotoğraf otomatik olarak kare kırpılır ve 600×600 boyutuna getirilir.")}</p>
          </div>
          <div className="grid md:grid-cols-2 gap-2">
            <label className="text-sm">{tx("Ad soyad")} *
              <input className="field mt-1" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="text-sm">{tx("Unvan / görev")}
              <input className="field mt-1" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </label>
            <label className="text-sm">{tx("Kurum")}
              <input className="field mt-1" value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} />
            </label>
            <label className="text-sm">LinkedIn
              <input className="field mt-1" type="url" placeholder="https://www.linkedin.com/in/…" value={form.linkedin} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} />
            </label>
            <label className="text-sm md:col-span-2">{tx("Kısa özet")}
              <textarea className="field mt-1" rows={2} maxLength={400} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
            </label>
            <label className="text-sm md:col-span-2">{tx("Özgeçmiş")}
              <textarea className="field mt-1" rows={6} maxLength={4000} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
            </label>
            <div className="md:col-span-2 flex gap-2">
              <button className="btn" disabled={busy}>
                {busy ? tx("Kaydediliyor…") : editing ? tx("Kaydet") : manager ? tx("Konuşmacı ekle") : tx("Onaya gönder")}
              </button>
              <button type="button" className="btn ghost" onClick={closeForm}>{tx("Vazgeç")}</button>
            </div>
          </div>
        </form>
      ) : null}

      {manager && pending.length ? (
        <section className="card p-4 space-y-3">
          <h2 className="font-semibold">{tx("Onay bekleyen firma önerileri")} ({pending.length})</h2>
          {pending.map((s) => (
            <div key={s.id} className="flex flex-wrap items-start gap-3 border-t border-[#DCE8F0] pt-3">
              <SpeakerAvatar name={s.name} photoPath={s.photoPath} size={56} />
              <div className="flex-1 min-w-[220px]">
                <div className="font-semibold">{s.name}</div>
                <div className="text-sm text-[#57534e]">{[s.title, s.organization].filter(Boolean).join(" · ")}</div>
                {s.summary ? <p className="text-sm mt-1">{s.summary}</p> : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input className="field w-56" placeholder={tx("Not (isteğe bağlı)")} value={notes[s.id] || ""} onChange={(e) => setNotes({ ...notes, [s.id]: e.target.value })} />
                <button className="btn" onClick={() => void patch(s, { review: "approve", reviewNote: notes[s.id] || "" })}>{tx("Onayla")}</button>
                <button className="btn ghost" onClick={() => void patch(s, { review: "reject", reviewNote: notes[s.id] || "" })}>{tx("Reddet")}</button>
                <button className="btn ghost" onClick={() => openEdit(s)} title={tx("Düzenle")}><Pencil size={14} /></button>
              </div>
            </div>
          ))}
        </section>
      ) : null}

      <section className="card p-0 overflow-x-auto">
        {rest.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[#57534e]">
                {manager ? <th className="p-3 w-16">{tx("Sıra")}</th> : null}
                <th className="p-3">{tx("Konuşmacı")}</th>
                <th className="p-3">{tx("Durum")}</th>
                {manager ? <th className="p-3">{tx("Bantta göster")}</th> : null}
                <th className="p-3 text-right">{tx("İşlem")}</th>
              </tr>
            </thead>
            <tbody>
              {rest.map((s, i) => (
                <tr key={s.id} className="border-t border-[#DCE8F0] align-top">
                  {manager ? (
                    <td className="p-3">
                      <div className="flex flex-col gap-1">
                        <button className="btn ghost px-2 py-1" disabled={i === 0} onClick={() => void patch(s, { move: "up" })} title={tx("Yukarı")}><ArrowUp size={14} /></button>
                        <button className="btn ghost px-2 py-1" disabled={i === rest.length - 1} onClick={() => void patch(s, { move: "down" })} title={tx("Aşağı")}><ArrowDown size={14} /></button>
                      </div>
                    </td>
                  ) : null}
                  <td className="p-3">
                    <div className="flex items-start gap-3">
                      <SpeakerAvatar name={s.name} photoPath={s.photoPath} size={52} />
                      <div>
                        <div className="font-semibold">{s.name}</div>
                        <div className="text-[#57534e]">{[s.title, s.organization].filter(Boolean).join(" · ") || "—"}</div>
                        {s.linkedin ? (
                          <a className="inline-flex items-center gap-1 text-[#0077C2] text-xs" href={s.linkedin} target="_blank" rel="noreferrer">
                            LinkedIn <ExternalLink size={12} />
                          </a>
                        ) : null}
                        {s.reviewNote ? <div className="text-xs text-[#57534e] mt-1">{tx("Not")}: {s.reviewNote}</div> : null}
                      </div>
                    </div>
                  </td>
                  <td className="p-3"><span className={`badge ${BADGE[s.status] || ""}`}>{tx(s.status)}</span></td>
                  {manager ? (
                    <td className="p-3">
                      <input type="checkbox" checked={s.active} onChange={(e) => void patch(s, { active: e.target.checked })} aria-label={tx("Bantta göster")} />
                    </td>
                  ) : null}
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      {canEdit(s) ? (
                        <>
                          <button className="btn ghost px-2" onClick={() => openEdit(s)} title={tx("Düzenle")}><Pencil size={14} /></button>
                          <button className="btn ghost px-2" onClick={() => void remove(s)} title={tx("Sil")}><Trash2 size={14} /></button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="p-4 text-[#57534e]">{manager ? tx("Henüz konuşmacı yok.") : tx("Henüz konuşmacı önermediniz.")}</p>
        )}
      </section>
    </div>
  );
}
