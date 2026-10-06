"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { api, useApi, useRealtime } from "@/lib/client";
import { useI18n } from "@/components/I18nProvider";

type Msg = { id: string; authorId: string; body: string; createdAt: string };
type Thread = { id: string; title: string; status: string; messages: Msg[] };
type Payload = { me: { id: string; role: string }; threads: Thread[]; users: { id: string; name: string; role: string }[] };

export default function QaPage() {
  const { tx, tag } = useI18n();
  const { data, reload } = useApi<Payload>("/api/qa");
  const [active, setActive] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useRealtime((type) => {
    if (type === "qa") void reload();
  });

  const thread = useMemo(() => data?.threads.find((item) => item.id === active), [data, active]);
  const people = useMemo(() => new Map((data?.users || []).map((user) => [user.id, user])), [data]);
  const manage = data?.me.role === "ADMIN" || data?.me.role === "SAGLIK";

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [thread?.id, thread?.messages.length]);

  async function openQuestion(event: FormEvent) {
    event.preventDefault();
    if (title.trim().length < 3 || body.trim().length < 1 || busy) return;
    setBusy(true);
    setError("");
    try {
      const created = await api<Thread>("/api/qa", { method: "POST", body: JSON.stringify({ title, body }) });
      setTitle("");
      setBody("");
      await reload();
      setActive(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Soru açılamadı");
    } finally {
      setBusy(false);
    }
  }

  async function reply(event?: FormEvent) {
    event?.preventDefault();
    if (!thread || text.trim().length < 1 || busy) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/qa", { method: "POST", body: JSON.stringify({ threadId: thread.id, body: text }) });
      setText("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gönderilemedi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="display text-4xl">{tx("Soru-cevap")}</h1>
        <p className="text-[#57534e]">{tx("Her soru kendi konuşmasıdır. Firma sorar, Sağlık Bakanlığı yanıtlar. Yazışma için Mesaj kutusunu kullanın.")}</p>
      </div>
      <div className="grid lg:grid-cols-[300px_1fr] gap-4 min-h-[70vh]">
        <aside className="card p-3 flex flex-col">
          <form className="space-y-2 pb-3 mb-3 border-b border-[#DCE8F0]" onSubmit={openQuestion}>
            <p className="text-xs tracking-[0.14em] uppercase text-[#0077C2]">{tx("Yeni soru")}</p>
            <input className="field" placeholder={tx("Soru başlığı")} value={title} onChange={(e) => setTitle(e.target.value)} />
            <textarea className="field" rows={3} placeholder={tx("Sorunuz")} value={body} onChange={(e) => setBody(e.target.value)} />
            <button className="btn w-full justify-center" disabled={busy || title.trim().length < 3 || body.trim().length < 1} type="submit">{tx("Soru aç")}</button>
          </form>
          <div className="space-y-1 overflow-auto">
            {(data?.threads || []).map((item) => (
              <button key={item.id} type="button" onClick={() => setActive(item.id)} className={`w-full text-left px-2 py-2 ${active === item.id ? "bg-[#EEF8FD]" : ""}`}>
                <span className={`badge ${item.status === "Açık" ? "ok" : "muted"}`}>{tx(item.status)}</span>
                <div className="font-semibold text-sm mt-1">{item.title}</div>
                <div className="text-xs text-[#57534e] truncate">{item.messages.at(-1)?.body}</div>
              </button>
            ))}
            {!data?.threads.length ? <p className="text-sm text-[#57534e] px-1">{tx("Açık soru yok.")}</p> : null}
          </div>
        </aside>
        <section className="card p-4 flex flex-col min-h-[70vh]">
          {!thread ? <p className="text-[#57534e]">{tx("Soldan bir soru seçin.")}</p> : (
            <>
              <div className="flex justify-between gap-2">
                <h2 className="display text-2xl">{thread.title}</h2>
                {manage && thread.status === "Açık" ? (
                  <button className="btn ghost" type="button" onClick={async () => { await api("/api/qa", { method: "POST", body: JSON.stringify({ action: "close", id: thread.id }) }); await reload(); }}>{tx("Kapat")}</button>
                ) : null}
              </div>
              <div className="flex-1 overflow-auto mt-4 space-y-2">
                {thread.messages.map((message) => {
                  const author = people.get(message.authorId);
                  const mine = message.authorId === data?.me.id;
                  return (
                    <div key={message.id} className={`max-w-[80%] px-3 py-2 ${mine ? "ml-auto bg-[#0077C2] text-white" : "bg-[#EEF8FD] text-[#0B1C33]"}`}>
                      {!mine ? <div className="text-[11px] font-semibold mb-1">{author?.name || tx("Katılımcı")}</div> : null}
                      <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
                      <div className={`text-[10px] mt-1 ${mine ? "text-white/80" : "text-[#3E6A88]"}`}>
                        {new Date(message.createdAt).toLocaleString(tag, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>
              {thread.status === "Açık" ? (
                <form className="mt-3 flex gap-2 items-end" onSubmit={reply}>
                  <textarea
                    className="field"
                    rows={2}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={tx("Yanıt yazın")}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void reply();
                      }
                    }}
                  />
                  <button className="btn" disabled={busy || text.trim().length < 1} type="submit">{tx("Gönder")}</button>
                </form>
              ) : <p className="text-sm text-[#57534e] mt-3">{tx("Bu konu kapatıldı.")}</p>}
              {error ? <p className="text-sm text-[#e31c23] mt-2">{error}</p> : null}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
