"use client";

import { useMemo, useState } from "react";
import { api, useApi, useRealtime } from "@/lib/client";
import { useI18n } from "@/components/I18nProvider";

type Msg = { id: string; authorId: string; body: string; createdAt: string };
type Thread = { id: string; title: string; status: string; messages: Msg[] };
type Payload = { threads: Thread[]; users: { id: string; name: string; role: string }[] };

export default function QaPage() {
  const { tx } = useI18n();
  const { data, reload } = useApi<Payload>("/api/qa");
  const [active, setActive] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [text, setText] = useState("");

  useRealtime((t) => {
    if (t === "qa") void reload();
  });

  const thread = useMemo(() => data?.threads.find((t) => t.id === active), [data, active]);
  const nameOf = (id: string) => data?.users.find((u) => u.id === id)?.name || "Katılımcı";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="display text-4xl">{tx("Soru-cevap")}</h1>
        <p className="text-[#57534e]">Hâlâ açık oturumlar. Firma yetkilileri sorar, admin ve SGGM yanıtlar — mesajlar anlık yansır.</p>
      </div>
      <div className="grid lg:grid-cols-[300px_1fr] gap-4">
        <aside className="card p-3 space-y-2">
          {(data?.threads || []).map((t) => (
            <button key={t.id} onClick={() => setActive(t.id)} className={`w-full text-left px-2 py-2 ${active === t.id ? "bg-[#EEF8FD]" : ""}`}>
              <span className={`badge ${t.status === "Açık" ? "ok" : "muted"}`}>{t.status}</span>
              <div className="font-semibold text-sm mt-1">{t.title}</div>
            </button>
          ))}
          <input className="field" placeholder="Soru başlığı" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="field" rows={3} placeholder="Sorunuz" value={body} onChange={(e) => setBody(e.target.value)} />
          <button className="btn w-full justify-center" onClick={async () => {
            const created = await api<Thread>("/api/qa", { method: "POST", body: JSON.stringify({ title, body }) });
            setTitle(""); setBody("");
            await reload();
            setActive(created.id);
          }}>Soru aç</button>
        </aside>
        <section className="card p-4">
          {!thread ? <p>Açık bir soru seçin.</p> : (
            <>
              <div className="flex justify-between gap-2">
                <h2 className="display text-2xl">{thread.title}</h2>
                {thread.status === "Açık" ? (
                  <button className="btn ghost" onClick={async () => { await api("/api/qa", { method: "POST", body: JSON.stringify({ action: "close", id: thread.id }) }); await reload(); }}>Kapat</button>
                ) : null}
              </div>
              <div className="mt-4 space-y-3">
                {thread.messages.map((m) => (
                  <div key={m.id} className="border-l-2 border-[#0077C2] pl-3">
                    <div className="text-xs text-[#57534e]">{nameOf(m.authorId)} · {new Date(m.createdAt).toLocaleString("tr-TR")}</div>
                    <div>{m.body}</div>
                  </div>
                ))}
              </div>
              {thread.status === "Açık" ? (
                <div className="mt-4 flex gap-2">
                  <input className="field" value={text} onChange={(e) => setText(e.target.value)} placeholder="Yanıt" />
                  <button className="btn" onClick={async () => {
                    await api("/api/qa", { method: "POST", body: JSON.stringify({ threadId: thread.id, body: text }) });
                    setText("");
                    await reload();
                  }}>Gönder</button>
                </div>
              ) : <p className="text-sm text-[#57534e] mt-3">Bu konu kapatıldı.</p>}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
