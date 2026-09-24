"use client";

import { QrImage } from "@/components/QrImage";
import { api } from "@/lib/client";
import { DAY_END_MIN, DAY_START_MIN, fromMinutes, toMinutes } from "@/lib/agenda-time";
import { useI18n } from "@/components/I18nProvider";
import { useRef, useState } from "react";

export type AgendaRow = {
  id: string;
  startTime: string;
  endTime: string;
  title: string;
  description: string;
  location: string;
  type: string;
  status: string;
  slotKey?: string;
  _count?: { signups: number };
};

const COLORS: Record<string, string> = {
  Etkinlik: "#E31C23",
  Sunum: "#00A3E0",
  Panel: "#32C45A",
};

const PX = 1.7;

type Signup = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  organization: string;
  role: string;
};

export function AgendaDayBoard({
  date,
  items,
  canEdit,
  onChanged,
}: {
  date: string;
  items: AgendaRow[];
  canEdit: boolean;
  onChanged: () => Promise<void>;
}) {
  const { tx } = useI18n();
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<AgendaRow>>({});
  const [msg, setMsg] = useState({ title: "COP31 hatırlatma", body: "", audience: "hepsi" });
  const [sent, setSent] = useState("");
  const [signups, setSignups] = useState<Signup[]>([]);
  const drag = useRef<{ id: string; startY: number; startMin: number; dur: number; moved: boolean } | null>(null);
  const span = DAY_END_MIN - DAY_START_MIN;

  const hours: string[] = [];
  for (let m = DAY_START_MIN; m <= DAY_END_MIN; m += 60) {
    hours.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:00`);
  }

  async function saveTimes(id: string, startTime: string, endTime: string) {
    if (!canEdit) return;
    await api(`/api/agenda/${id}`, { method: "PATCH", body: JSON.stringify({ startTime, endTime }) });
    await onChanged();
  }

  async function saveMeta(id: string) {
    if (!canEdit) return;
    await api(`/api/agenda/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: draft.title,
        location: draft.location,
        description: draft.description,
        type: draft.type,
      }),
    });
    await onChanged();
  }

  async function loadSignups(id: string) {
    try {
      const list = await api<Signup[]>(`/api/agenda/${id}/signups`);
      setSignups(list);
    } catch {
      setSignups([]);
    }
  }

  function onPointerDown(e: React.PointerEvent, item: AgendaRow) {
    if (!canEdit) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = {
      id: item.id,
      startY: e.clientY,
      startMin: toMinutes(item.startTime),
      dur: Math.max(15, toMinutes(item.endTime) - toMinutes(item.startTime)),
      moved: false,
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    if (Math.abs(e.clientY - drag.current.startY) > 4) drag.current.moved = true;
    const el = document.querySelector(`[data-agenda-block="${drag.current.id}"]`) as HTMLElement | null;
    if (!el) return;
    const deltaMin = (e.clientY - drag.current.startY) / PX;
    const start = fromMinutes(drag.current.startMin + deltaMin);
    const end = fromMinutes(toMinutes(start) + drag.current.dur);
    el.style.top = `${(toMinutes(start) - DAY_START_MIN) * PX}px`;
    el.style.height = `${Math.max(28, (toMinutes(end) - toMinutes(start)) * PX)}px`;
    el.dataset.previewStart = start;
    el.dataset.previewEnd = end;
    const label = el.querySelector("[data-time-label]");
    if (label) label.textContent = `${start}–${end}`;
  }

  async function onPointerUp(e: React.PointerEvent) {
    if (!drag.current) return;
    const id = drag.current.id;
    const moved = drag.current.moved;
    const el = document.querySelector(`[data-agenda-block="${id}"]`) as HTMLElement | null;
    drag.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    if (!moved) return;
    const start = el?.dataset.previewStart;
    const end = el?.dataset.previewEnd;
    if (start && end) await saveTimes(id, start, end);
  }

  const current = items.find((a) => a.id === open);

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#3E6A88]">
        {tx("Her gün 1 etkinlik, 2 sunum, 2 panel. Kutuları sürükleyerek saati kaydırın; 15 dakikaya oturur.")}
      </p>
      <div className="agenda-track">
        <div className="agenda-hours">
          {hours.map((h) => (
            <div key={h} className="agenda-hour" style={{ height: 60 * PX }}>
              {h}
            </div>
          ))}
        </div>
        <div className="agenda-canvas" style={{ height: span * PX }}>
          {items.map((a) => {
            const top = (toMinutes(a.startTime) - DAY_START_MIN) * PX;
            const height = Math.max(28, (toMinutes(a.endTime) - toMinutes(a.startTime)) * PX);
            const color = COLORS[a.type] || "#0077C2";
            return (
              <button
                key={a.id}
                type="button"
                data-agenda-block={a.id}
                className="agenda-block"
                style={{ top, height, borderLeftColor: color }}
                onPointerDown={(e) => onPointerDown(e, a)}
                onPointerMove={onPointerMove}
                onPointerUp={(e) => void onPointerUp(e)}
                onClick={() => {
                  if (drag.current) return;
                  setOpen(a.id);
                  setDraft(a);
                  setSent("");
                  void loadSignups(a.id);
                }}
              >
                <div className="text-[10px] uppercase tracking-wide" style={{ color }}>
                  {tx(a.type)}
                  {a.slotKey ? " · slot" : ""}
                </div>
                <div className="font-semibold text-sm leading-tight">{tx(a.title)}</div>
                <div className="text-xs text-[#3E6A88]" data-time-label>
                  {a.startTime}–{a.endTime}
                </div>
                <div className="text-[11px] text-[#3E6A88]">
                  {a._count?.signups || 0} {tx("kayıt")}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {current ? (
        <div className="card p-4 space-y-3">
          <div className="flex justify-between gap-3 flex-wrap">
            <h3 className="display text-2xl">{tx(current.title)}</h3>
            <button className="btn ghost" onClick={() => setOpen(null)}>
              {tx("Kapat")}
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm">
                {tx("Başlık")}
                <input
                  className="field mt-1"
                  value={draft.title || ""}
                  disabled={!canEdit}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-sm">
                  {tx("Başlangıç")}
                  <input
                    className="field mt-1"
                    type="time"
                    value={draft.startTime || current.startTime}
                    disabled={!canEdit}
                    onChange={(e) => setDraft((d) => ({ ...d, startTime: e.target.value }))}
                  />
                </label>
                <label className="text-sm">
                  {tx("Bitiş")}
                  <input
                    className="field mt-1"
                    type="time"
                    value={draft.endTime || current.endTime}
                    disabled={!canEdit}
                    onChange={(e) => setDraft((d) => ({ ...d, endTime: e.target.value }))}
                  />
                </label>
              </div>
              <label className="text-sm">
                {tx("Yer")}
                <input
                  className="field mt-1"
                  value={draft.location || ""}
                  disabled={!canEdit}
                  onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
                />
              </label>
              {canEdit ? (
                <button
                  className="btn"
                  onClick={async () => {
                    await saveMeta(current.id);
                    if (draft.startTime && draft.endTime) {
                      await saveTimes(current.id, draft.startTime, draft.endTime);
                    }
                  }}
                >
                  {tx("Kaydet")}
                </button>
              ) : null}
            </div>
            <div className="flex gap-4 items-start">
              <QrImage path={`/g/${current.id}`} alt="Kayıt QR" size={120} />
              <div>
                <div className="text-xs tracking-[0.16em] uppercase text-[#0077C2]">{tx("Katılım QR")}</div>
                <p className="text-sm mt-1">{tx("Telefon ve e-posta ile kayıt. Saat değişince otomatik haber gider.")}</p>
                <a className="text-sm text-[#0077C2] underline" href={`/g/${current.id}`} target="_blank">
                  /g/{current.id.slice(0, 8)}…
                </a>
              </div>
            </div>
          </div>
          {canEdit ? (
            <div className="border-t border-[#DCE8F0] pt-3 space-y-2">
              <div className="text-xs tracking-[0.16em] uppercase text-[#0077C2]">{tx("Otomatik mesaj")}</div>
              <input
                className="field"
                value={msg.title}
                onChange={(e) => setMsg({ ...msg, title: e.target.value })}
                placeholder={tx("Başlık")}
              />
              <textarea
                className="field"
                rows={3}
                value={msg.body}
                onChange={(e) => setMsg({ ...msg, body: e.target.value })}
                placeholder={tx("Katılımcı veya konuşmacılara gidecek metin")}
              />
              <div className="flex flex-wrap gap-2 items-center">
                <select
                  className="field w-auto"
                  value={msg.audience}
                  onChange={(e) => setMsg({ ...msg, audience: e.target.value })}
                >
                  <option value="hepsi">{tx("Katılımcı + konuşmacı")}</option>
                  <option value="katilimci">{tx("Yalnız katılımcılar")}</option>
                  <option value="konusmaci">{tx("Yalnız konuşmacılar")}</option>
                </select>
                <button
                  className="btn"
                  onClick={async () => {
                    const res = await api<{ sent: number }>(`/api/agenda/${current.id}/message`, {
                      method: "POST",
                      body: JSON.stringify(msg),
                    });
                    setSent(`${res.sent} ${tx("kişiye gönderildi")}`);
                  }}
                >
                  {tx("Gönder")}
                </button>
                {sent ? <span className="text-sm text-[#32C45A]">{sent}</span> : null}
              </div>
            </div>
          ) : null}
          <div>
            <div className="text-xs tracking-[0.16em] uppercase text-[#0077C2] mb-2">{tx("Kayıtlı kişiler")}</div>
            {signups.length === 0 ? (
              <p className="text-sm text-[#57534e]">{tx("Henüz QR kaydı yok.")}</p>
            ) : (
              <ul className="text-sm space-y-1">
                {signups.map((s) => (
                  <li key={s.id}>
                    {s.fullName} · {s.email} · {s.phone} · {tx(s.role === "konusmaci" ? "Konuşmacı" : "Katılımcı")}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
      <p className="hidden">{date}</p>
    </div>
  );
}
