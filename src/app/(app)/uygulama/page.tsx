"use client";

import { useState } from "react";
import { api, useApi, useRealtime } from "@/lib/client";

type Tag = {
  id: string;
  code: string;
  title: string;
  message: string;
  location: string;
  active: boolean;
  scans: number;
};
type Question = {
  id: string;
  sessionTitle: string;
  author: string;
  organization: string;
  body: string;
  status: string;
  answer: string;
  createdAt: string;
};
type Meeting = {
  id: string;
  kind: string;
  withName: string;
  topic: string;
  message: string;
  preferredDate: string;
  preferredTime: string;
  status: string;
  whenDate: string;
  startTime: string;
  endTime: string;
  location: string;
  note: string;
  fromName: string;
  fromOrganization: string;
  fromRole: string;
  updatedAt?: string;
};
type Board = {
  tags: Tag[];
  questions: Question[];
  meetings: Meeting[];
  recent: { id: string; code: string; title: string; name: string; organization: string; createdAt: string }[];
  stats: { devices: number; pushEnabled: number; scans: number; joins: number };
};

export default function VisitorAdminPage() {
  const board = useApi<Board>("/api/pavilion");
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [message, setMessage] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [sent, setSent] = useState("");
  const [error, setError] = useState("");

  useRealtime((type) => {
    if (type === "app") void board.reload();
  });

  async function createTag() {
    setError("");
    try {
      await api("/api/pavilion/tags", {
        method: "POST",
        body: JSON.stringify({ code, title, location, message }),
      });
      setCode("");
      setTitle("");
      setLocation("");
      setMessage("");
      await board.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Etiket eklenemedi");
    }
  }

  async function broadcast() {
    setError("");
    setSent("");
    try {
      const result = await api<{ sent: number }>("/api/pavilion/broadcast", {
        method: "POST",
        body: JSON.stringify({ title: noteTitle, body: noteBody }),
      });
      setSent(`${result.sent} telefona düştü`);
      setNoteTitle("");
      setNoteBody("");
      await board.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bildirim gönderilemedi");
    }
  }

  const data = board.data;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="display text-4xl">Ziyaretçi uygulaması</h1>
        <p className="text-[#3E6A88] mt-1 max-w-3xl">
          Ziyaretçi, firma ve konuşmacı aynı uygulamayı kullanır. Sunum sorusu buradan gelir. İkili görüşme ve toplantı talebi kabul edilince saati ve yeri düzenlenir.
        </p>
      </div>
      {error ? <p className="text-[#E31C23]">{error}</p> : null}

      <section className="grid lg:grid-cols-[220px_1fr] gap-4">
        <div className="card p-4 text-center">
          <img src="/api/qr?path=/u" alt="Uygulama karekodu" className="mx-auto w-40 h-40" />
          <p className="text-sm mt-2">Telefon bu kodu okutunca uygulama açılır.</p>
          <a className="text-sm text-[#0077C2] underline" href="/u">/u</a>
        </div>
        <div className="grid sm:grid-cols-4 gap-2">
          {[
            ["Telefon", data?.stats.devices ?? "—"],
            ["Bildirim açık", data?.stats.pushEnabled ?? "—"],
            ["Etiket okutma", data?.stats.scans ?? "—"],
            ["Katılım", data?.stats.joins ?? "—"],
          ].map(([label, value]) => (
            <div key={label} className="card p-4">
              <div className="text-xs uppercase tracking-[0.14em] text-[#0077C2]">{label}</div>
              <div className="display text-4xl">{value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-4">
        <div className="card p-4 space-y-2">
          <h2 className="display text-2xl">Yeni etiket</h2>
          <p className="text-sm text-[#3E6A88]">Kodu yazın, mesajı kaydedin, çıkan karekodu standa veya yaka kartına basın.</p>
          <input className="field" placeholder="Kod (ör. SAHNE)" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
          <input className="field" placeholder="Başlık" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input className="field" placeholder="Konum" value={location} onChange={(e) => setLocation(e.target.value)} />
          <textarea className="field" rows={4} placeholder="Telefona düşecek mesaj" value={message} onChange={(e) => setMessage(e.target.value)} />
          <button className="btn" type="button" onClick={() => void createTag()}>Etiketi oluştur</button>
        </div>
        <div className="card p-4 space-y-2">
          <h2 className="display text-2xl">Bildirim gönder</h2>
          <p className="text-sm text-[#3E6A88]">Uygulamayı açmış her telefona mesaj kutusu notu düşer. Bildirim izni verenlere telefon bildirimi de gider.</p>
          <input className="field" placeholder="Başlık" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} />
          <textarea className="field" rows={4} placeholder="Metin" value={noteBody} onChange={(e) => setNoteBody(e.target.value)} />
          <button className="btn" type="button" onClick={() => void broadcast()}>Telefona gönder</button>
          {sent ? <p className="text-sm text-[#0077C2]">{sent}</p> : null}
        </div>
      </section>

      <section className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {(data?.tags || []).map((tag) => (
          <article key={tag.id} className="card p-4">
            <div className="flex gap-3">
              <img src={`/api/qr?path=${encodeURIComponent(`/u/etiket/${tag.code}`)}`} alt="" className="w-24 h-24" />
              <div className="min-w-0">
                <div className="text-xs tracking-[0.14em] text-[#0077C2]">{tag.code} · {tag.scans} okutma</div>
                <h3 className="font-semibold">{tag.title}</h3>
                <p className="text-sm text-[#3E6A88]">{tag.location}</p>
              </div>
            </div>
            <p className="text-sm mt-2">{tag.message}</p>
            <div className="flex gap-2 mt-3">
              <button
                className="btn ghost"
                type="button"
                onClick={async () => {
                  await api("/api/pavilion/tags", { method: "PATCH", body: JSON.stringify({ id: tag.id, active: !tag.active }) });
                  await board.reload();
                }}
              >
                {tag.active ? "Kapat" : "Aç"}
              </button>
              <button
                className="btn ghost"
                type="button"
                onClick={async () => {
                  await api(`/api/pavilion/tags?id=${tag.id}`, { method: "DELETE" });
                  await board.reload();
                }}
              >
                Sil
              </button>
            </div>
          </article>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="display text-3xl">İkili görüşme ve toplantı</h2>
        {(data?.meetings || []).map((meeting) => (
          <DeskMeeting key={`${meeting.id}:${meeting.updatedAt || meeting.status}`} meeting={meeting} onDone={() => board.reload()} />
        ))}
        {!data?.meetings.length ? <p className="text-sm text-[#3E6A88]">Henüz talep yok.</p> : null}
      </section>

      <section className="grid lg:grid-cols-[1fr_280px] gap-4">
        <div className="space-y-2">
          <h2 className="display text-3xl">Sunum soruları</h2>
          {(data?.questions || []).map((question) => (
            <QuestionCard key={question.id} question={question} onDone={() => board.reload()} />
          ))}
          {!data?.questions.length ? <p className="text-sm text-[#3E6A88]">Henüz soru yok.</p> : null}
        </div>
        <div className="card p-4">
          <h2 className="font-semibold">Son okutmalar</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {(data?.recent || []).map((scan) => (
              <li key={scan.id}>
                <strong>{scan.name}</strong>
                {scan.organization ? ` · ${scan.organization}` : ""} okuttu: {scan.code}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

function DeskMeeting({ meeting, onDone }: { meeting: Meeting; onDone: () => void }) {
  const [form, setForm] = useState({
    whenDate: meeting.whenDate,
    startTime: meeting.startTime,
    endTime: meeting.endTime,
    location: meeting.location,
    note: meeting.note,
  });
  const who = meeting.fromRole === "firma" ? "Firma" : meeting.fromRole === "konusmaci" ? "Konuşmacı" : "Ziyaretçi";
  return (
    <article className="card p-4 space-y-2">
      <div className="flex justify-between gap-2 text-sm">
        <strong>{meeting.kind === "ikili" ? "İkili görüşme" : "Toplantı"} · {meeting.status}</strong>
        <span>{who}</span>
      </div>
      <p>{meeting.fromName}{meeting.fromOrganization ? ` · ${meeting.fromOrganization}` : ""} → {meeting.withName}</p>
      <p className="font-semibold">{meeting.topic}</p>
      {meeting.message ? <p className="text-sm text-[#3E6A88]">{meeting.message}</p> : null}
      {meeting.status === "Bekliyor" ? (
        <p className="text-sm">İstenen saat: {[meeting.preferredDate, meeting.preferredTime].filter(Boolean).join(" ") || "belirtilmedi"}</p>
      ) : null}
      {meeting.status === "Bekliyor" ? (
        <div className="flex gap-2">
          <button className="btn" type="button" onClick={async () => { await api("/api/pavilion/meetings", { method: "PATCH", body: JSON.stringify({ id: meeting.id, status: "Kabul" }) }); onDone(); }}>Kabul et</button>
          <button className="btn ghost" type="button" onClick={async () => { await api("/api/pavilion/meetings", { method: "PATCH", body: JSON.stringify({ id: meeting.id, status: "Red" }) }); onDone(); }}>Reddet</button>
        </div>
      ) : null}
      {meeting.status === "Kabul" ? (
        <form
          className="grid sm:grid-cols-2 gap-2"
          onSubmit={async (event) => {
            event.preventDefault();
            await api("/api/pavilion/meetings", { method: "PATCH", body: JSON.stringify({ id: meeting.id, ...form }) });
            onDone();
          }}
        >
          <input className="field" type="date" value={form.whenDate} onChange={(e) => setForm({ ...form, whenDate: e.target.value })} />
          <input className="field" type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
          <input className="field" type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
          <input className="field" placeholder="Yer" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <textarea className="field sm:col-span-2" rows={2} placeholder="Not" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <button className="btn" type="submit">Görüşmeyi güncelle</button>
        </form>
      ) : null}
    </article>
  );
}

function QuestionCard({ question, onDone }: { question: Question; onDone: () => void }) {
  const [answer, setAnswer] = useState(question.answer);
  return (
    <article className="card p-4 space-y-2">
      <div className="flex justify-between gap-2 text-sm">
        <strong>{question.author}</strong>
        <span>{question.sessionTitle}</span>
      </div>
      <p>{question.body}</p>
      {question.organization ? <p className="text-xs text-[#3E6A88]">{question.organization}</p> : null}
      <div className="flex flex-wrap gap-2">
        {["Yeni", "Sahnede", "Yanıtlandı"].map((status) => (
          <button
            key={status}
            className={`btn ${question.status === status ? "" : "ghost"}`}
            type="button"
            onClick={async () => {
              await api("/api/pavilion/questions", { method: "PATCH", body: JSON.stringify({ id: question.id, status }) });
              onDone();
            }}
          >
            {status}
          </button>
        ))}
      </div>
      <textarea className="field" rows={2} placeholder="Yanıt telefonuna düşsün" value={answer} onChange={(e) => setAnswer(e.target.value)} />
      <button
        className="btn"
        type="button"
        onClick={async () => {
          await api("/api/pavilion/questions", {
            method: "PATCH",
            body: JSON.stringify({ id: question.id, answer, status: "Yanıtlandı" }),
          });
          onDone();
        }}
      >
        Yanıtı gönder
      </button>
    </article>
  );
}
