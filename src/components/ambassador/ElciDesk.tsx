"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type MutableRefObject, type RefObject } from "react";
import { api, useApi } from "@/lib/client";

type Msg = { id: string; body: string; createdAt: string; fromAdmin: boolean; mine?: boolean; author: string };
type Group = { id: string; name: string; size: number; lastBody: string; lastAt: string };
type Peer = { id: string; name: string; school: string };
type Task = {
  assignmentId: string;
  title: string;
  detail: string;
  unit: string;
  target: number;
  amount: number;
  note: string;
  status: string;
  updatedAt: string;
};
type Desk = { me: { id: string; name: string; school: string }; peers: Peer[]; groups: Group[]; tasks: Task[]; messages: Msg[]; thread: string };

const STATUSES = ["Bekliyor", "Devam ediyor", "Tamamlandı"];

function when(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function ElciDesk() {
  const [tab, setTab] = useState<"gorev" | "yonetim" | "grup" | "elci">("gorev");
  const [groupId, setGroupId] = useState("");
  const [peerId, setPeerId] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  const url = useMemo(() => {
    if (tab === "grup" && groupId) return `/api/ambassador/desk?grup=${encodeURIComponent(groupId)}`;
    if (tab === "yonetim") return "/api/ambassador/desk?yonetim=1";
    if (tab === "elci" && peerId) return `/api/ambassador/desk?kisi=${encodeURIComponent(peerId)}`;
    return "/api/ambassador/desk";
  }, [tab, groupId, peerId]);

  const { data, error, reload } = useApi<Desk>(url);

  useEffect(() => {
    const id = window.setInterval(() => void reload(true), 8000);
    return () => window.clearInterval(id);
  }, [reload]);

  useEffect(() => {
    if (!data) return;
    if (groupId && data.groups.some((group) => group.id === groupId)) return;
    setGroupId(data.groups[0]?.id || "");
  }, [data, groupId]);

  useEffect(() => {
    const el = box.current;
    if (stick.current && el) el.scrollTop = el.scrollHeight;
  }, [data?.messages]);

  async function post(payload: Record<string, unknown>) {
    setBusy(true);
    setFormError("");
    try {
      await api("/api/ambassador/desk", { method: "POST", body: JSON.stringify(payload) });
      await reload(true);
      return true;
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "İşlem başarısız");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function leave() {
    await api("/api/ambassador/logout", { method: "POST" });
    window.location.assign("/giris/elciler?sekme=giris");
  }

  const tasks = data?.tasks || [];
  const openCount = tasks.filter((task) => task.status !== "Tamamlandı").length;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.16em] uppercase text-[#0077C2]">İklim Sağlık Elçisi</p>
          <h1 className="display text-3xl">{data?.me.name || "Masa"}</h1>
          {data?.me.school ? <p className="text-sm text-[#3E6A88]">{data.me.school}</p> : null}
        </div>
        <div className="flex gap-2">
          <Link className="btn ghost" href="/program">Takvim</Link>
          <Link className="btn ghost" href="/elci/hediye">Hediye</Link>
          <button className="btn ghost" type="button" onClick={() => void leave()}>Çıkış</button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button className={tab === "gorev" ? "btn" : "btn ghost"} type="button" onClick={() => setTab("gorev")}>
          Görevler{openCount ? ` (${openCount})` : ""}
        </button>
        <button className={tab === "yonetim" ? "btn" : "btn ghost"} type="button" onClick={() => { stick.current = true; setTab("yonetim"); }}>Yönetim</button>
        <button className={tab === "grup" ? "btn" : "btn ghost"} type="button" onClick={() => { stick.current = true; setTab("grup"); }}>Gruplar</button>
        <button className={tab === "elci" ? "btn" : "btn ghost"} type="button" onClick={() => { stick.current = true; setTab("elci"); }}>Elçiler</button>
      </div>
      {error || formError ? <p className="text-sm text-[#E31C23]">{formError || error}</p> : null}

      {tab === "gorev" ? (
        <div className="space-y-3">
          {tasks.length === 0 ? <p className="card p-4 text-sm text-[#3E6A88]">Size verilmiş görev yok.</p> : null}
          {tasks.map((task) => {
            const pct = task.target > 0 ? Math.min(100, Math.round((task.amount / task.target) * 100)) : 0;
            return (
              <form
                key={`${task.assignmentId}-${task.updatedAt}`}
                className="card p-4 space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  void post({
                    action: "report",
                    assignmentId: task.assignmentId,
                    amount: fd.get("amount"),
                    status: fd.get("status"),
                    note: fd.get("note"),
                  });
                }}
              >
                <div>
                  <h2 className="font-semibold text-lg">{task.title}</h2>
                  {task.detail ? <p className="text-sm whitespace-pre-wrap text-[#3E6A88]">{task.detail}</p> : null}
                </div>
                {task.target > 0 ? (
                  <div>
                    <p className="text-sm">{task.amount} / {task.target} {task.unit}</p>
                    <div className="mt-1 h-1.5 bg-[#D8F0FA]">
                      <div className="h-1.5 bg-[#0077C2]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                ) : null}
                <div className="grid sm:grid-cols-2 gap-2">
                  <label className="text-sm text-[#57534e]">Yaptığım miktar ({task.unit})
                    <input className="field mt-1" name="amount" type="number" min={0} defaultValue={task.amount} />
                  </label>
                  <label className="text-sm text-[#57534e]">Durum
                    <select className="field mt-1" name="status" defaultValue={task.status}>
                      {STATUSES.map((status) => <option key={status}>{status}</option>)}
                    </select>
                  </label>
                </div>
                <label className="text-sm text-[#57534e]">Not
                  <input className="field mt-1" name="note" defaultValue={task.note} placeholder="Ne yaptığınızı kısaca yazın" />
                </label>
                <p className="text-xs text-[#3E6A88]">Son kayıt: {when(task.updatedAt) || "henüz yok"}</p>
                <button className="btn" disabled={busy}>Bildir</button>
              </form>
            );
          })}
        </div>
      ) : null}

      {tab === "yonetim" ? (
        <ChatPane
          box={box}
          stick={stick}
          hint="Bu yazışmayı yalnız siz ve yönetim görür."
          ready={data?.thread === "yonetim"}
          messages={data?.thread === "yonetim" ? data.messages : []}
          text={text}
          setText={setText}
          busy={busy}
          onSend={() => {
            void post({ action: "send", body: text }).then((ok) => {
              if (ok) setText("");
            });
          }}
        />
      ) : null}

      {tab === "grup" ? (
        <div className="space-y-3">
          {(data?.groups || []).length === 0 ? <p className="card p-4 text-sm text-[#3E6A88]">Henüz bir gruba eklenmediniz.</p> : null}
          {(data?.groups || []).length > 0 ? (
            <div className="flex gap-2 flex-wrap">
              {(data?.groups || []).map((group) => (
                <button
                  key={group.id}
                  className={group.id === groupId ? "btn" : "btn ghost"}
                  type="button"
                  onClick={() => {
                    stick.current = true;
                    setGroupId(group.id);
                  }}
                >
                  {group.name} ({group.size})
                </button>
              ))}
            </div>
          ) : null}
          {groupId ? (
            <ChatPane
              box={box}
              stick={stick}
              hint="Grup üyeleri ve yönetim bu yazışmayı görür."
              ready={data?.thread === `grup:${groupId}`}
              messages={data?.thread === `grup:${groupId}` ? data.messages : []}
              text={text}
              setText={setText}
              busy={busy}
              onSend={() => {
                void post({ action: "send", groupId, body: text }).then((ok) => {
                  if (ok) setText("");
                });
              }}
            />
          ) : null}
        </div>
      ) : null}

      {tab === "elci" ? (
        <div className="space-y-3">
          {(data?.peers || []).length === 0 ? <p className="card p-4 text-sm text-[#3E6A88]">Başka kabul edilmiş elçi yok.</p> : null}
          <div className="flex gap-2 flex-wrap">
            {(data?.peers || []).map((peer) => (
              <button
                key={peer.id}
                className={peer.id === peerId ? "btn" : "btn ghost"}
                type="button"
                onClick={() => {
                  stick.current = true;
                  setPeerId(peer.id);
                }}
              >
                {peer.name}{peer.school ? ` · ${peer.school}` : ""}
              </button>
            ))}
          </div>
          {peerId ? (
            <ChatPane
              box={box}
              stick={stick}
              hint="Bu yazışmayı yalnız siz ve seçtiğiniz elçi görür."
              ready={data?.thread === `kisi:${peerId}`}
              messages={data?.thread === `kisi:${peerId}` ? data.messages : []}
              text={text}
              setText={setText}
              busy={busy}
              onSend={() => {
                void post({ action: "send", peerId, body: text }).then((ok) => {
                  if (ok) setText("");
                });
              }}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ChatPane({
  box,
  stick,
  hint,
  ready,
  messages,
  text,
  setText,
  busy,
  onSend,
}: {
  box: RefObject<HTMLDivElement | null>;
  stick: MutableRefObject<boolean>;
  hint: string;
  ready: boolean;
  messages: Msg[];
  text: string;
  setText: (value: string) => void;
  busy: boolean;
  onSend: () => void;
}) {
  return (
    <section className="card p-3 flex flex-col min-h-[480px]">
      <p className="text-sm text-[#3E6A88] pb-2 border-b border-[#B5DFF2]">{hint}</p>
      <div
        ref={box}
        className="flex-1 overflow-auto py-3 space-y-2"
        onScroll={() => {
          const el = box.current;
          if (!el) return;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
      >
        {messages.map((msg) => (
          <div key={msg.id} className={`max-w-[85%] px-3 py-2 ${(msg.mine ?? !msg.fromAdmin) ? "ml-auto bg-[#0077C2] text-white" : "bg-[#F4FBFE] border border-[#B5DFF2]"}`}>
            <p className={`text-xs ${(msg.mine ?? !msg.fromAdmin) ? "text-white/80" : "text-[#3E6A88]"}`}>{msg.author} · {when(msg.createdAt)}</p>
            <p className="whitespace-pre-wrap">{msg.body}</p>
          </div>
        ))}
        {messages.length === 0 ? <p className="text-sm text-[#3E6A88]">{ready ? "Henüz mesaj yok." : "Yükleniyor…"}</p> : null}
      </div>
      <form
        className="flex gap-2 pt-3 border-t border-[#B5DFF2]"
        onSubmit={(e) => {
          e.preventDefault();
          onSend();
        }}
      >
        <textarea className="field min-h-16" placeholder="Mesaj yazın" value={text} onChange={(e) => setText(e.target.value)} />
        <button className="btn" disabled={busy || !text.trim()}>Gönder</button>
      </form>
    </section>
  );
}
