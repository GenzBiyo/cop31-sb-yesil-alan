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
};

type Conversation = {
  threadId: string;
  peerId: string;
  asUnit: string;
  channel: string;
  title: string;
  subtitle: string;
  lastBody: string;
  lastAt: string | null;
  needsReply: boolean;
  messages: ChatMessage[];
};

type Contact = { id: string; name: string; kind: "paydas" | "birim"; hint: string };

type Payload = {
  me: { id: string; role: string; name: string };
  canSend: boolean;
  units: string[];
  contacts: Contact[];
  conversations: Conversation[];
};

export default function MessagesPage() {
  const { tx, tag } = useI18n();
  const { data, reload } = useApi<Payload>("/api/messages");
  const [threadId, setThreadId] = useState("");
  const [peerId, setPeerId] = useState("");
  const [asUnit, setAsUnit] = useState("");
  const [query, setQuery] = useState("");
  const [picking, setPicking] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const staff = data?.me.role === "ADMIN" || data?.me.role === "SAGLIK";

  useRealtime((type) => {
    if (type === "message" || type === "qa") void reload();
  });

  useEffect(() => {
    if (asUnit || !data?.units[0]) return;
    setAsUnit(data.units[0]);
  }, [asUnit, data]);

  const conversation = useMemo(
    () => data?.conversations.find((item) => item.threadId === threadId),
    [data, threadId],
  );
  const peer = useMemo(() => data?.contacts.find((item) => item.id === peerId), [data, peerId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [conversation?.threadId, conversation?.messages.length, peerId]);

  const needle = query.trim().toLocaleLowerCase("tr");
  const visible = (data?.conversations || []).filter((item) => item.title.toLocaleLowerCase("tr").includes(needle));
  const contactList = (data?.contacts || []).filter((item) => {
    if (staff && item.id === `u:${asUnit}`) return false;
    const blob = `${item.name} ${item.hint}`.toLocaleLowerCase("tr");
    return blob.includes(needle);
  });

  function openConversation(item: Conversation) {
    setThreadId(item.threadId);
    setPeerId(item.channel === "dm" ? item.peerId : "");
    if (item.asUnit) setAsUnit(item.asUnit);
    setPicking(false);
    setError("");
  }

  function openContact(item: Contact) {
    const found = data?.conversations.find(
      (row) => row.channel === "dm" && row.peerId === item.id && (!staff || !row.asUnit || row.asUnit === asUnit),
    );
    setPeerId(item.id);
    setThreadId(found?.threadId || "");
    setPicking(false);
    setError("");
  }

  async function send(event?: FormEvent) {
    event?.preventDefault();
    const text = draft.trim();
    const target = conversation?.threadId || peerId;
    if (!text || !target || busy) return;
    setBusy(true);
    setError("");
    try {
      const created = await api<{ threadId?: string }>("/api/messages", {
        method: "POST",
        body: JSON.stringify(
          conversation?.threadId
            ? { threadId: conversation.threadId, body: text }
            : { peerId, asUnit, body: text },
        ),
      });
      setDraft("");
      if (created.threadId) setThreadId(created.threadId);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gönderilemedi");
    } finally {
      setBusy(false);
    }
  }

  const title = conversation?.title || peer?.name || "";
  const subtitle = conversation?.subtitle || peer?.hint || "";

  return (
    <div className="grid gap-4 min-h-[72vh] lg:grid-cols-[320px_1fr]">
      <aside className="card p-3 flex flex-col min-h-[70vh]">
        <div className="flex items-center justify-between gap-2 px-1">
          <h1 className="display text-2xl">{tx("Mesaj kutusu")}</h1>
          {data?.canSend ? (
            <button type="button" className={picking ? "btn ghost" : "btn"} onClick={() => setPicking((on) => !on)}>
              {picking ? tx("Yazışmalar") : tx("Yeni mesaj")}
            </button>
          ) : null}
        </div>
        <p className="text-xs text-[#57534e] px-1 mt-1 mb-3">
          {tx("Onaylı paydaşlar ve Sağlık Bakanlığı birimleri birbirine yazar. Eski soru-cevaplar da bu kutudadır.")}
        </p>
        {staff && data?.units.length ? (
          <label className="text-xs text-[#3E6A88] mb-2">
            {tx("Birim olarak yaz")}
            <select className="field mt-1" value={asUnit} onChange={(e) => setAsUnit(e.target.value)}>
              {data.units.map((unit) => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
          </label>
        ) : null}
        <input className="field mb-2" placeholder={picking ? tx("Kişi veya birim ara") : tx("Yazışma ara")} value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="flex-1 overflow-auto space-y-1">
          {picking
            ? contactList.map((item) => (
                <button key={item.id} type="button" onClick={() => openContact(item)} className={`w-full text-left px-2 py-2 ${peerId === item.id ? "bg-[#EEF8FD]" : ""}`}>
                  <div className="text-sm font-semibold truncate">{item.name}</div>
                  <div className="text-xs text-[#57534e]">{tx(item.hint)}</div>
                </button>
              ))
            : visible.map((item) => (
                <button key={item.threadId} type="button" onClick={() => openConversation(item)} className={`w-full text-left px-2 py-2 ${threadId === item.threadId ? "bg-[#EEF8FD]" : ""}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold truncate">{item.title}</span>
                    {item.needsReply ? <span className="badge high shrink-0">{tx("yeni")}</span> : null}
                  </div>
                  <div className="text-xs text-[#57534e] truncate">{item.lastBody || tx("Henüz yazışma yok")}</div>
                </button>
              ))}
          {picking && !contactList.length ? <p className="text-sm text-[#57534e] px-1">{tx("Kayıt bulunamadı")}</p> : null}
          {!picking && !visible.length ? <p className="text-sm text-[#57534e] px-1">{tx("Henüz mesaj yok.")}</p> : null}
        </div>
      </aside>

      <section className="card p-4 flex flex-col min-h-[70vh]">
        {!data ? (
          <p className="text-[#57534e]">{tx("Yükleniyor…")}</p>
        ) : !data.canSend ? (
          <p className="text-[#57534e]">{tx("Mesaj için paydaş kaydının onaylı olması gerekir.")}</p>
        ) : !title ? (
          <p className="text-[#57534e]">{tx("Soldan bir yazışma seçin veya yeni mesaj açın.")}</p>
        ) : (
          <>
            <header>
              <h2 className="display text-2xl">{title}</h2>
              <p className="text-xs text-[#57534e]">{tx(subtitle)}</p>
            </header>
            <div className="flex-1 overflow-auto mt-4 space-y-2 pr-1">
              {!conversation?.messages.length ? <p className="text-sm text-[#57534e]">{tx("İlk mesajı yazın.")}</p> : null}
              {conversation?.messages.map((message, index) => {
                const prev = conversation.messages[index - 1];
                const day = new Date(message.createdAt).toLocaleDateString(tag);
                const showDay = !prev || new Date(prev.createdAt).toLocaleDateString(tag) !== day;
                return (
                  <div key={message.id}>
                    {showDay ? <p className="text-center text-[11px] text-[#3E6A88] my-2">{day}</p> : null}
                    <div className={`max-w-[80%] px-3 py-2 ${message.mine ? "ml-auto bg-[#0077C2] text-white" : "bg-[#EEF8FD] text-[#0B1C33]"}`}>
                      {!message.mine ? <div className="text-[11px] font-semibold mb-1">{message.authorName}</div> : null}
                      <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
                      <div className={`text-[10px] mt-1 ${message.mine ? "text-white/80" : "text-[#3E6A88]"}`}>
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
            {error ? <p className="text-sm text-[#e31c23] mt-2">{error}</p> : null}
          </>
        )}
      </section>
    </div>
  );
}
