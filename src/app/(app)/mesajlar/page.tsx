"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { api, useApi, useRealtime } from "@/lib/client";
import { useI18n } from "@/components/I18nProvider";

type ChatMessage = {
  id: string;
  body: string;
  createdAt: string;
  authorName: string;
  mine: boolean;
  side: "bakanlik" | "firma";
  topic: string;
};

type Conversation = {
  companyId: string;
  companyName: string;
  lastBody: string;
  lastAt: string | null;
  needsReply: boolean;
  messages: ChatMessage[];
};

type Payload = {
  me: { id: string; role: string; name: string };
  conversations: Conversation[];
};

export default function MessagesPage() {
  const { tx, tag } = useI18n();
  const { data, reload } = useApi<Payload>("/api/messages");
  const [companyId, setCompanyId] = useState("");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useRealtime((type) => {
    if (type === "message") void reload();
  });

  const manage = data?.me.role === "ADMIN" || data?.me.role === "SAGLIK";
  const conversation = useMemo(
    () => data?.conversations.find((item) => item.companyId === companyId) || (!manage ? data?.conversations[0] : undefined),
    [data, companyId, manage],
  );

  useEffect(() => {
    if (manage || companyId || !data?.conversations[0]) return;
    setCompanyId(data.conversations[0].companyId);
  }, [manage, companyId, data]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [conversation?.companyId, conversation?.messages.length]);

  const visible = (data?.conversations || []).filter((item) =>
    item.companyName.toLocaleLowerCase("tr").includes(query.trim().toLocaleLowerCase("tr")),
  );

  async function send(event?: FormEvent) {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || !conversation || busy) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/messages", {
        method: "POST",
        body: JSON.stringify({ companyId: conversation.companyId, body: text }),
      });
      setDraft("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gönderilemedi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`grid gap-4 min-h-[72vh] ${manage ? "lg:grid-cols-[300px_1fr]" : ""}`}>
      {manage ? (
        <aside className="card p-3 flex flex-col min-h-[70vh]">
          <h1 className="display text-2xl px-1">{tx("Mesaj kutusu")}</h1>
          <p className="text-xs text-[#57534e] px-1 mb-3">{tx("Her firmanın tek yazışması vardır. Duyurular Anonslar sayfasındadır.")}</p>
          <input className="field mb-2" placeholder={tx("Firma ara")} value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="flex-1 overflow-auto space-y-1">
            {visible.map((item) => {
              const on = conversation?.companyId === item.companyId;
              return (
                <button
                  key={item.companyId}
                  type="button"
                  onClick={() => setCompanyId(item.companyId)}
                  className={`w-full text-left px-2 py-2 ${on ? "bg-[#EEF8FD]" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold truncate">{item.companyName}</span>
                    {item.needsReply ? <span className="badge high shrink-0">{tx("yeni")}</span> : null}
                  </div>
                  <div className="text-xs text-[#57534e] truncate">{item.lastBody || tx("Henüz yazışma yok")}</div>
                  {item.lastAt ? <div className="text-[10px] text-[#3E6A88]">{new Date(item.lastAt).toLocaleString(tag)}</div> : null}
                </button>
              );
            })}
            {!visible.length ? <p className="text-sm text-[#57534e] px-1">{tx("Firma bulunamadı")}</p> : null}
          </div>
        </aside>
      ) : null}

      <section className="card p-4 flex flex-col min-h-[70vh]">
        {!data ? (
          <p className="text-[#57534e]">{tx("Yükleniyor…")}</p>
        ) : !conversation ? (
          <div>
            {!manage ? <h1 className="display text-3xl">{tx("Mesaj kutusu")}</h1> : null}
            <p className={`text-[#57534e] ${manage ? "" : "mt-2"}`}>{manage ? tx("Yazışmak için soldan bir firma seçin.") : tx("Hesabınıza bağlı firma yok.")}</p>
          </div>
        ) : (
          <>
            <header>
              {!manage ? <p className="text-xs tracking-[0.16em] uppercase text-[#0077C2]">{tx("Mesaj kutusu")}</p> : null}
              <h2 className="display text-2xl">{manage ? conversation.companyName : tx("T.C. Sağlık Bakanlığı")}</h2>
              <p className="text-xs text-[#57534e]">
                {manage ? tx("Bu yazışmayı firma hesabı da görür.") : tx("Yanıtınız hazırlık masasındaki Sağlık Bakanlığı ekibine gider.")}
              </p>
            </header>
            <div className="flex-1 overflow-auto mt-4 space-y-2 pr-1">
              {!conversation.messages.length ? (
                <p className="text-sm text-[#57534e]">{tx("İlk mesajı yazın. Konu açmanıza gerek yok.")}</p>
              ) : null}
              {conversation.messages.map((message, index) => {
                const prev = conversation.messages[index - 1];
                const day = new Date(message.createdAt).toLocaleDateString(tag);
                const showDay = !prev || new Date(prev.createdAt).toLocaleDateString(tag) !== day;
                const showTopic = Boolean(message.topic && message.topic !== prev?.topic);
                const ours = manage ? message.side === "bakanlik" : message.side === "firma";
                return (
                  <div key={message.id}>
                    {showDay ? <p className="text-center text-[11px] text-[#3E6A88] my-2">{day}</p> : null}
                    {showTopic ? <p className="text-center text-[11px] text-[#0077C2] my-2">{message.topic}</p> : null}
                    <div className={`max-w-[80%] px-3 py-2 ${ours ? "ml-auto bg-[#0077C2] text-white" : "bg-[#EEF8FD] text-[#0B1C33]"}`}>
                      {!message.mine ? <div className={`text-[11px] font-semibold mb-1 ${ours ? "text-white/80" : ""}`}>{message.authorName}</div> : null}
                      <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
                      <div className={`text-[10px] mt-1 ${ours ? "text-white/80" : "text-[#3E6A88]"}`}>
                        {new Date(message.createdAt).toLocaleTimeString(tag, { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>
            <form className="mt-3 flex gap-2 items-end" onSubmit={send}>
              <textarea
                className="field min-h-12"
                rows={2}
                placeholder={tx("Mesaj yazın")}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void send();
                  }
                }}
              />
              <button className="btn" disabled={busy || draft.trim().length < 1} type="submit">
                {busy ? tx("Gönderiliyor…") : tx("Gönder")}
              </button>
            </form>
            {error ? <p className="text-sm text-[#e31c23] mt-2">{tx(error) === error ? error : tx(error)}</p> : null}
          </>
        )}
      </section>
    </div>
  );
}
