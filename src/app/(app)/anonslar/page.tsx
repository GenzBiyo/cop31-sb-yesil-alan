"use client";

import { useState } from "react";
import { api, useApi, useRealtime } from "@/lib/client";
import { useI18n } from "@/components/I18nProvider";

type Inbox = { id: string; title: string; body: string; read: boolean; createdAt: string };
type Ann = { id: string; title: string; body: string; createdAt: string; emailStatus: string };
type Payload = { announcements: Ann[]; emails: { id: string; to: string; subject: string; status: string; createdAt: string }[] };

export default function AnnouncementsPage() {
  const { tx } = useI18n();
  const inbox = useApi<Inbox[]>("/api/inbox");
  const board = useApi<Payload>("/api/announcements");
  const me = useApi<{ role: string }>("/api/auth/me");
  const canSend = me.data?.role === "ADMIN" || me.data?.role === "SAGLIK";
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [role, setRole] = useState("");

  useRealtime((t) => {
    if (t === "announcement" || t === "inbox") {
      void inbox.reload();
      void board.reload();
    }
  });

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <section className="space-y-3">
        <h1 className="display text-4xl">{tx("Mesaj kutusu / Anonslar")}</h1>
        <p className="text-[#57534e]">Admin anonsları hem kayıtlı e-postanıza hem bu kutuya anlık düşer.</p>
        <button className="btn ghost" onClick={async () => { await api("/api/inbox", { method: "PATCH", body: JSON.stringify({ all: true }) }); await inbox.reload(); }}>Tümünü okundu işaretle</button>
        {(inbox.data || []).map((item) => (
          <button
            key={item.id}
            className="card p-4 w-full text-left"
            onClick={async () => {
              await api("/api/inbox", { method: "PATCH", body: JSON.stringify({ id: item.id }) });
              await inbox.reload();
            }}
          >
            <div className="flex justify-between">
              <strong>{item.title}</strong>
              {!item.read ? <span className="badge high">yeni</span> : null}
            </div>
            <p className="text-sm mt-1">{item.body}</p>
            <p className="text-xs text-[#57534e] mt-2">{new Date(item.createdAt).toLocaleString("tr-TR")}</p>
          </button>
        ))}
      </section>
      {canSend ? (
      <section className="card p-4 space-y-3">
        <h2 className="display text-2xl">Yeni anons</h2>
        <input className="field" placeholder="Başlık" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="field" rows={5} placeholder="Metin" value={body} onChange={(e) => setBody(e.target.value)} />
        <select className="field" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">Firmalar + SB</option>
          <option value="FIRMA">Sadece firmalar</option>
          <option value="SAGLIK">Sadece SB</option>
        </select>
        <button className="btn" onClick={async () => {
          await api("/api/announcements", { method: "POST", body: JSON.stringify({ title, body, role: role || undefined }) });
          setTitle(""); setBody("");
          await board.reload();
          await inbox.reload();
        }}>Anonsu yayınla ve e-posta gönder</button>
        <h3 className="font-semibold pt-2">Gönderilenler</h3>
        {(board.data?.announcements || []).map((a) => (
          <div key={a.id} className="text-sm border-b border-[#DCE8F0] pb-2">
            <div>{a.title} <span className="badge muted">{a.emailStatus}</span></div>
            <div className="text-[#57534e]">{a.body}</div>
          </div>
        ))}
        <h3 className="font-semibold pt-2">E-posta günlüğü</h3>
        <ul className="text-xs space-y-1 max-h-40 overflow-auto">
          {(board.data?.emails || []).map((e) => (
            <li key={e.id}>{e.to} — {e.subject} ({e.status})</li>
          ))}
        </ul>
      </section>
      ) : null}
    </div>
  );
}
