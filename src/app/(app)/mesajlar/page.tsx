"use client";

import { useMemo, useState } from "react";
import { api, useApi, useRealtime } from "@/lib/client";
import { useI18n } from "@/components/I18nProvider";

type Msg = { id: string; authorId: string; body: string; createdAt: string };
type Thread = { id: string; title: string; status: string; companyId: string | null; messages: Msg[] };
type Payload = {
  threads: Thread[];
  users: { id: string; name: string; role: string }[];
  companies: { id: string; name: string }[];
};

export default function MessagesPage() {
  const { tx } = useI18n();
  const { data, reload } = useApi<Payload>("/api/messages");
  const [active, setActive] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [text, setText] = useState("");

  useRealtime((t) => {
    if (t === "message" || t === "inbox") void reload();
  });

  const thread = useMemo(() => data?.threads.find((t) => t.id === active), [data, active]);
  const nameOf = (id: string) => data?.users.find((u) => u.id === id)?.name || "Kullanıcı";

  return (
    <div className="grid lg:grid-cols-[280px_1fr] gap-4 min-h-[70vh]">
      <aside className="card p-3">
        <h1 className="display text-2xl px-1">{tx("Mesaj kutusu")}</h1>
        <p className="text-xs text-[#57534e] px-1 mb-3">Firma soruları anlık düşer.</p>
        <div className="space-y-1 max-h-[50vh] overflow-auto">
          {(data?.threads || []).map((t) => (
            <button key={t.id} onClick={() => setActive(t.id)} className={`w-full text-left px-2 py-2 ${active === t.id ? "bg-[#EEF8FD]" : ""}`}>
              <div className="text-sm font-semibold">{t.title}</div>
              <div className="text-xs text-[#57534e] truncate">{t.messages.at(-1)?.body}</div>
            </button>
          ))}
        </div>
        <div className="mt-3 space-y-2">
          <input className="field" placeholder="Yeni konu" value={title} onChange={(e) => setTitle(e.target.value)} />
          {data?.companies?.length ? (
            <select className="field" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
              <option value="">Firma seçin</option>
              {data.companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          ) : null}
          <textarea className="field" rows={3} placeholder="Mesaj" value={body} onChange={(e) => setBody(e.target.value)} />
          <button className="btn w-full justify-center" onClick={async () => {
            const created = await api<Thread>("/api/messages", { method: "POST", body: JSON.stringify({ title, body, companyId }) });
            setTitle(""); setBody("");
            await reload();
            setActive(created.id);
          }}>Konu aç</button>
        </div>
      </aside>
      <section className="card p-4 flex flex-col">
        {!thread ? <p className="text-[#57534e]">Bir konuşma seçin veya yeni konu açın.</p> : (
          <>
            <h2 className="display text-2xl">{thread.title}</h2>
            <div className="flex-1 overflow-auto space-y-3 mt-3">
              {thread.messages.map((m) => (
                <div key={m.id}>
                  <div className="text-xs text-[#0077C2]">{nameOf(m.authorId)} · {new Date(m.createdAt).toLocaleString("tr-TR")}</div>
                  <div>{m.body}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input className="field" value={text} onChange={(e) => setText(e.target.value)} placeholder="Yanıt yazın" />
              <button className="btn" onClick={async () => {
                await api("/api/messages", { method: "POST", body: JSON.stringify({ threadId: thread.id, body: text }) });
                setText("");
                await reload();
              }}>Gönder</button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
