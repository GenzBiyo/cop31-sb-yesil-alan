"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api, useApi } from "@/lib/client";

type Msg = { id: string; body: string; createdAt: string; fromAdmin: boolean; author: string };
type Person = { id: string; fullName: string; school: string; email: string; lastBody: string; lastAt: string };
type Group = {
  id: string;
  name: string;
  memberIds: string[];
  members: { id: string; fullName: string; school: string }[];
  lastBody: string;
  lastAt: string;
};
type Work = {
  id: string;
  applicationId: string;
  name: string;
  school: string;
  amount: number;
  note: string;
  status: string;
  updatedAt: string;
};
type Task = {
  id: string;
  title: string;
  detail: string;
  unit: string;
  target: number;
  groupName: string;
  createdAt: string;
  done: number;
  totalAmount: number;
  work: Work[];
};
type Log = { id: string; name: string; title: string; unit: string; amount: number; note: string; status: string; createdAt: string };
type Desk = { people: Person[]; groups: Group[]; tasks: Task[]; logs: Log[]; messages: Msg[]; thread: string };
type Sel = { kind: "none" } | { kind: "group"; id: string } | { kind: "person"; id: string } | { kind: "toplu" };

const STATUSES = ["Bekliyor", "Devam ediyor", "Tamamlandı"];

function when(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function snippet(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 64 ? `${clean.slice(0, 64)}…` : clean;
}

export default function ElciTakipPage() {
  const [sel, setSel] = useState<Sel>({ kind: "none" });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");
  const [query, setQuery] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftMembers, setDraftMembers] = useState<string[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [rename, setRename] = useState("");
  const [membersOpen, setMembersOpen] = useState(false);
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [unit, setUnit] = useState("adet");
  const [target, setTarget] = useState("1");
  const [taskGroup, setTaskGroup] = useState("");
  const [taskPeople, setTaskPeople] = useState<string[]>([]);
  const [openTask, setOpenTask] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  const url = useMemo(() => {
    if (sel.kind === "group") return `/api/elci-desk?grup=${encodeURIComponent(sel.id)}`;
    if (sel.kind === "person") return `/api/elci-desk?kisi=${encodeURIComponent(sel.id)}`;
    if (sel.kind === "toplu") return "/api/elci-desk?toplu=1";
    return "/api/elci-desk";
  }, [sel]);

  const { data, error, loading, reload } = useApi<Desk>(url);

  useEffect(() => {
    const id = window.setInterval(() => void reload(true), 8000);
    return () => window.clearInterval(id);
  }, [reload]);

  useEffect(() => {
    const el = box.current;
    if (stick.current && el) el.scrollTop = el.scrollHeight;
  }, [data?.messages]);

  async function post(payload: Record<string, unknown>) {
    setBusy(true);
    setFormError("");
    setNotice("");
    try {
      const result = await api<Record<string, unknown>>("/api/elci-desk", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      await reload(true);
      return result;
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "İşlem başarısız");
      return null;
    } finally {
      setBusy(false);
    }
  }

  const people = data?.people || [];
  const groups = data?.groups || [];
  const needle = query.toLocaleLowerCase("tr");
  const shownPeople = people.filter((person) =>
    `${person.fullName} ${person.school}`.toLocaleLowerCase("tr").includes(needle),
  );
  const group = sel.kind === "group" ? groups.find((item) => item.id === sel.id) : undefined;
  const person = sel.kind === "person" ? people.find((item) => item.id === sel.id) : undefined;
  const expectedThread = sel.kind === "group" ? `grup:${sel.id}` : sel.kind === "person" ? `kisi:${sel.id}` : "";
  const messages = data?.thread === expectedThread ? data.messages : [];

  function toggle(list: string[], id: string, set: (next: string[]) => void) {
    set(list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);
  }

  async function createGroup() {
    const result = await post({ action: "createGroup", name: draftName, memberIds: draftMembers });
    if (!result) return;
    setShowNew(false);
    setDraftName("");
    setDraftMembers([]);
    if (typeof result.groupId === "string") {
      setSel({ kind: "group", id: result.groupId });
      setPicked(draftMembers);
      setMembersOpen(true);
    }
  }

  async function send() {
    if (sel.kind === "toplu") {
      if (!window.confirm("Bu mesaj kabul edilen her elçinin yönetim sohbetine gidecek.")) return;
      const result = await post({ action: "broadcast", body: text });
      if (!result) return;
      setText("");
      setNotice(`${String(result.count || "")} elçiye iletildi.`);
      return;
    }
    const result = await post({
      action: "send",
      body: text,
      groupId: sel.kind === "group" ? sel.id : "",
      applicationId: sel.kind === "person" ? sel.id : "",
    });
    if (result) setText("");
  }

  const chatTitle =
    sel.kind === "group" ? group?.name || "Grup" :
    sel.kind === "person" ? person?.fullName || "Elçi" :
    sel.kind === "toplu" ? "Toplu mesaj" : "Sohbet";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="display text-4xl">Elçi takip</h1>
        <p className="text-[#57534e]">
          Grup açın, yönetim ve grup sohbetini yürütün, görevin kimde ne kadar ilerlediğini görün.
        </p>
        <a className="text-sm text-[#0077C2] underline" href="/elciler">Başvurulara dön</a>
      </div>
      {error || formError ? <p className="text-sm text-[#E31C23]">{formError || error}</p> : null}
      {notice ? <p className="text-sm text-[#22A34A]">{notice}</p> : null}

      <div className="grid gap-4 xl:grid-cols-[270px_minmax(0,1fr)_360px]">
        <aside className="card p-3 space-y-3">
          <div className="flex gap-2">
            <button className="btn" type="button" onClick={() => setShowNew((open) => !open)}>Yeni grup</button>
            <button className={sel.kind === "toplu" ? "btn" : "btn ghost"} type="button" onClick={() => setSel({ kind: "toplu" })}>Toplu mesaj</button>
          </div>
          {showNew ? (
            <div className="space-y-2 border border-[#B5DFF2] p-2">
              <input className="field" placeholder="Grup adı" value={draftName} onChange={(e) => setDraftName(e.target.value)} />
              <PersonChecks people={people} picked={draftMembers} onToggle={(id) => toggle(draftMembers, id, setDraftMembers)} />
              <button className="btn w-full justify-center" type="button" disabled={busy} onClick={() => void createGroup()}>Grubu aç</button>
            </div>
          ) : null}
          <div className="space-y-1">
            <p className="text-xs tracking-[0.14em] uppercase text-[#0077C2]">Gruplar</p>
            {groups.length === 0 ? <p className="text-sm text-[#3E6A88]">Henüz grup yok.</p> : null}
            {groups.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`w-full text-left px-2 py-2 border ${sel.kind === "group" && sel.id === item.id ? "border-[#0077C2] bg-[#E8F6FD]" : "border-[#B5DFF2] bg-white"}`}
                onClick={() => {
                  setSel({ kind: "group", id: item.id });
                  setPicked(item.memberIds);
                  setRename(item.name);
                  setMembersOpen(false);
                  stick.current = true;
                }}
              >
                <span className="block font-semibold">{item.name}</span>
                <span className="block text-xs text-[#3E6A88]">{item.members.length} elçi{item.lastAt ? ` · ${when(item.lastAt)}` : ""}</span>
                {item.lastBody ? <span className="block text-xs text-[#57534e]">{snippet(item.lastBody)}</span> : null}
              </button>
            ))}
          </div>
          <div className="space-y-1">
            <p className="text-xs tracking-[0.14em] uppercase text-[#0077C2]">Elçilerle yönetim sohbeti</p>
            <input className="field" placeholder="İsim veya okul ara" value={query} onChange={(e) => setQuery(e.target.value)} />
            <div className="max-h-80 overflow-auto space-y-1">
              {shownPeople.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`w-full text-left px-2 py-2 border ${sel.kind === "person" && sel.id === item.id ? "border-[#0077C2] bg-[#E8F6FD]" : "border-[#B5DFF2] bg-white"}`}
                  onClick={() => {
                    setSel({ kind: "person", id: item.id });
                    stick.current = true;
                  }}
                >
                  <span className="block font-semibold">{item.fullName}</span>
                  <span className="block text-xs text-[#3E6A88]">{item.school || "Okul yok"}{item.lastAt ? ` · ${when(item.lastAt)}` : ""}</span>
                  {item.lastBody ? <span className="block text-xs text-[#57534e]">{snippet(item.lastBody)}</span> : null}
                </button>
              ))}
              {!loading && shownPeople.length === 0 ? <p className="text-sm text-[#3E6A88]">Kabul edilmiş elçi yok.</p> : null}
            </div>
          </div>
        </aside>

        <section className="card p-3 flex flex-col min-h-[520px]">
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#B5DFF2]">
            <div>
              <h2 className="display text-2xl">{chatTitle}</h2>
              <p className="text-sm text-[#3E6A88]">
                {sel.kind === "toplu"
                  ? "Yazdığınız mesaj, kabul edilen her elçinin yönetim sohbetine düşer."
                  : sel.kind === "group"
                    ? "Grup üyeleri ve yönetim bu yazışmayı görür."
                    : sel.kind === "person"
                      ? "Bu yazışmayı yalnız bu elçi ve yönetim görür."
                      : "Soldan bir grup, bir elçi veya toplu mesaj seçin."}
              </p>
            </div>
            {group ? (
              <button className="btn ghost" type="button" onClick={() => setMembersOpen((open) => !open)}>Üyeler</button>
            ) : null}
          </div>
          {group && membersOpen ? (
            <div className="py-3 space-y-2 border-b border-[#B5DFF2]">
              <div className="flex gap-2">
                <input className="field" value={rename} onChange={(e) => setRename(e.target.value)} />
                <button className="btn ghost" type="button" disabled={busy} onClick={() => void post({ action: "renameGroup", groupId: group.id, name: rename })}>Adı kaydet</button>
              </div>
              <PersonChecks people={people} picked={picked} onToggle={(id) => toggle(picked, id, setPicked)} />
              <div className="flex gap-2">
                <button className="btn" type="button" disabled={busy} onClick={() => void post({ action: "setMembers", groupId: group.id, memberIds: picked })}>Üyeleri kaydet</button>
                <button
                  className="btn ghost"
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (!window.confirm("Grup ve grup sohbeti silinsin mi? Görev kayıtları durur.")) return;
                    void post({ action: "deleteGroup", groupId: group.id }).then((result) => {
                      if (result) setSel({ kind: "none" });
                    });
                  }}
                >Grubu sil</button>
              </div>
            </div>
          ) : null}
          <div
            ref={box}
            className="flex-1 overflow-auto py-3 space-y-2"
            onScroll={() => {
              const el = box.current;
              if (!el) return;
              stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
            }}
          >
            {sel.kind === "none" || sel.kind === "toplu" ? null : messages.map((msg) => (
              <div key={msg.id} className={`max-w-[85%] px-3 py-2 ${msg.fromAdmin ? "ml-auto bg-[#0077C2] text-white" : "bg-[#F4FBFE] border border-[#B5DFF2]"}`}>
                <p className={`text-xs ${msg.fromAdmin ? "text-white/80" : "text-[#3E6A88]"}`}>{msg.author} · {when(msg.createdAt)}</p>
                <p className="whitespace-pre-wrap">{msg.body}</p>
              </div>
            ))}
            {sel.kind !== "none" && sel.kind !== "toplu" && messages.length === 0 ? (
              <p className="text-sm text-[#3E6A88]">{data?.thread === expectedThread ? "Henüz mesaj yok." : "Yükleniyor…"}</p>
            ) : null}
          </div>
          {sel.kind === "none" ? null : (
            <form
              className="flex gap-2 pt-3 border-t border-[#B5DFF2]"
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
            >
              <textarea className="field min-h-16" placeholder="Mesaj yazın" value={text} onChange={(e) => setText(e.target.value)} />
              <button className="btn" disabled={busy || !text.trim()}>Gönder</button>
            </form>
          )}
        </section>

        <aside className="space-y-4">
          <section className="card p-3 space-y-3">
            <h2 className="display text-2xl">Görev dağıt</h2>
            <input className="field" placeholder="Görev başlığı" value={title} onChange={(e) => setTitle(e.target.value)} />
            <textarea className="field min-h-16" placeholder="Ne yapılacak?" value={detail} onChange={(e) => setDetail(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <label className="text-sm text-[#57534e]">Birim
                <input className="field mt-1" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="adet" />
              </label>
              <label className="text-sm text-[#57534e]">Kişi başı hedef
                <input className="field mt-1" type="number" min={0} value={target} onChange={(e) => setTarget(e.target.value)} />
              </label>
            </div>
            <label className="text-sm text-[#57534e]">Gruba ver
              <select className="field mt-1" value={taskGroup} onChange={(e) => setTaskGroup(e.target.value)}>
                <option value="">Grup seçilmedi</option>
                {groups.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <p className="text-xs text-[#3E6A88]">Grup seçerseniz üyelerine gider. Aşağıdan tek tek de ekleyebilirsiniz.</p>
            <PersonChecks people={people} picked={taskPeople} onToggle={(id) => toggle(taskPeople, id, setTaskPeople)} />
            <button
              className="btn w-full justify-center"
              type="button"
              disabled={busy}
              onClick={() => {
                void post({
                  action: "createTask",
                  title,
                  detail,
                  unit,
                  target: Number(target || 0),
                  groupId: taskGroup,
                  applicationIds: taskPeople,
                }).then((result) => {
                  if (!result) return;
                  setTitle("");
                  setDetail("");
                  setTaskPeople([]);
                });
              }}
            >Görevi dağıt</button>
          </section>

          <section className="card p-3 space-y-3">
            <h2 className="display text-2xl">Kim ne yaptı</h2>
            {(data?.tasks || []).length === 0 ? <p className="text-sm text-[#3E6A88]">Henüz görev yok.</p> : null}
            {(data?.tasks || []).map((task) => {
              const goal = task.target > 0 ? task.target * task.work.length : 0;
              const pct = goal > 0 ? Math.min(100, Math.round((task.totalAmount / goal) * 100)) : 0;
              return (
                <article key={task.id} className="border border-[#B5DFF2] p-2 space-y-2">
                  <button className="w-full text-left" type="button" onClick={() => setOpenTask((id) => id === task.id ? "" : task.id)}>
                    <span className="block font-semibold">{task.title}</span>
                    <span className="block text-xs text-[#3E6A88]">
                      {task.groupName ? `${task.groupName} · ` : ""}
                      {task.done}/{task.work.length} tamam · {task.totalAmount} {task.unit}
                      {goal > 0 ? ` · hedef ${goal}` : ""}
                    </span>
                    {goal > 0 ? (
                      <span className="mt-1 block h-1.5 bg-[#D8F0FA]">
                        <span className="block h-1.5 bg-[#0077C2]" style={{ width: `${pct}%` }} />
                      </span>
                    ) : null}
                  </button>
                  {openTask === task.id ? (
                    <div className="space-y-2">
                      {task.detail ? <p className="text-sm whitespace-pre-wrap">{task.detail}</p> : null}
                      {task.work.map((row) => (
                        <form
                          key={`${row.id}-${row.updatedAt}`}
                          className="grid gap-1 border border-[#D8F0FA] p-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const fd = new FormData(e.currentTarget);
                            void post({
                              action: "adjust",
                              workId: row.id,
                              amount: fd.get("amount"),
                              status: fd.get("status"),
                              note: fd.get("note"),
                            });
                          }}
                        >
                          <p className="text-sm font-semibold">{row.name}</p>
                          <p className="text-xs text-[#3E6A88]">{row.school} · son {when(row.updatedAt)}</p>
                          <div className="grid grid-cols-[1fr_1fr] gap-1">
                            <input className="field" name="amount" type="number" min={0} defaultValue={row.amount} />
                            <select className="field" name="status" defaultValue={row.status}>
                              {STATUSES.map((status) => <option key={status}>{status}</option>)}
                            </select>
                          </div>
                          <input className="field" name="note" defaultValue={row.note} placeholder="Not" />
                          <button className="btn ghost" disabled={busy}>Kaydet</button>
                        </form>
                      ))}
                      <button
                        className="btn ghost"
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          if (!window.confirm("Görev ve ilerleme kayıtları silinsin mi?")) return;
                          void post({ action: "deleteTask", taskId: task.id });
                        }}
                      >Görevi sil</button>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </section>

          <section className="card p-3 space-y-2">
            <h2 className="display text-2xl">Son hareketler</h2>
            {(data?.logs || []).length === 0 ? <p className="text-sm text-[#3E6A88]">Henüz bildirim yok.</p> : null}
            <div className="max-h-72 overflow-auto space-y-2">
              {(data?.logs || []).map((log) => (
                <p key={log.id} className="text-sm border-b border-[#D8F0FA] pb-2">
                  <span className="font-semibold">{log.name}</span> · {log.title}: {log.amount} {log.unit} · {log.status}
                  <span className="block text-xs text-[#3E6A88]">{when(log.createdAt)}{log.note ? ` · ${log.note}` : ""}</span>
                </p>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function PersonChecks({ people, picked, onToggle }: { people: Person[]; picked: string[]; onToggle: (id: string) => void }) {
  return (
    <div className="max-h-36 overflow-auto border border-[#B5DFF2] p-2 space-y-1 bg-white">
      {people.map((person) => (
        <label key={person.id} className="flex gap-2 text-sm">
          <input type="checkbox" checked={picked.includes(person.id)} onChange={() => onToggle(person.id)} />
          <span>{person.fullName}{person.school ? ` · ${person.school}` : ""}</span>
        </label>
      ))}
      {people.length === 0 ? <p className="text-sm text-[#3E6A88]">Kabul edilmiş elçi yok.</p> : null}
    </div>
  );
}
