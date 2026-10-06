"use client";

import { useState } from "react";
import { CalendarCheck } from "lucide-react";
import { api } from "@/lib/client";
import { useI18n } from "@/components/I18nProvider";
import { COP_DATES, copDayMeta } from "@/lib/cop-days";
import { formatParticipationDays, participationDays } from "@/lib/participation";

type Props = {
  companyId: string;
  participationDates: string;
  formDays?: string[];
  onSaved: () => Promise<void> | void;
  onCancel?: () => void;
};

export function ParticipationDays({ companyId, participationDates, formDays = [], onSaved, onCancel }: Props) {
  const { tx } = useI18n();
  const saved = participationDays(participationDates);
  const [days, setDays] = useState<string[]>(() => (saved.length ? saved : formDays.filter((d) => COP_DATES.includes(d))));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const dirty = formatParticipationDays(days) !== formatParticipationDays(saved);
  const unknownText = participationDates.trim() && !saved.length;

  function toggle(date: string) {
    setDays((cur) => (cur.includes(date) ? cur.filter((d) => d !== date) : [...cur, date].sort()));
  }

  async function save() {
    setBusy(true);
    setMsg("");
    setError("");
    try {
      const res = await api<{ slots: { removed: number; kept: number } }>(`/api/companies/${companyId}`, {
        method: "PATCH",
        body: JSON.stringify({ participationDays: days }),
      });
      const notes = [tx("Katılım günleri kaydedildi.")];
      if (res.slots.removed) notes.push(`${res.slots.removed} ${tx("boş toplantı saati kapanan günlerden kaldırıldı.")}`);
      if (res.slots.kept) notes.push(`${res.slots.kept} ${tx("saatte talep olduğu için silinmedi; Toplantılarım sayfasından yönetin.")}`);
      setMsg(notes.join(" "));
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : tx("Kaydedilemedi"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div id="katilim" className="border border-[#B5DFF2] bg-[#F2F9FD] p-3 space-y-3 scroll-mt-20">
      <div>
        <div className="font-semibold flex items-center gap-2"><CalendarCheck size={16} className="text-[#0077C2]" />{tx("Pavilyona hangi günler katılacaksınız?")}</div>
        <p className="text-sm text-[#57534e]">
          {tx("Takviminiz yalnızca seçtiğiniz günlerde açık olur. Diğer günler kapalı görünür; o günlere toplantı saati açılamaz ve size toplantı talebi gönderilemez.")}
        </p>
        {unknownText ? (
          <p className="text-xs text-[#c2410c] mt-1">{tx("Kayıtlı katılım bilgisi okunamadı")}: “{participationDates}”. {tx("Lütfen günleri aşağıdan seçin.")}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {COP_DATES.map((date) => {
          const m = copDayMeta(date);
          const on = days.includes(date);
          return (
            <button
              key={date}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(date)}
              className={`px-2 py-1 text-xs border text-left ${on ? "bg-[#00A3E0] border-[#00A3E0] text-white" : "border-[#B5DFF2] bg-white"}`}
              title={tx(m.theme)}
            >
              <b>{m.day} {tx("Kas")}</b> · {m.weekdayShort}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button type="button" className="underline" onClick={() => setDays([...COP_DATES])}>{tx("Tüm günler")}</button>
        <button type="button" className="underline" onClick={() => setDays([])}>{tx("Temizle")}</button>
        {formDays.length && formatParticipationDays(formDays) !== formatParticipationDays(days) ? (
          <button type="button" className="underline text-[#0077C2]" onClick={() => setDays(formDays.filter((d) => COP_DATES.includes(d)))}>
            {tx("Paydaş formundaki günleri kullan")} ({formatParticipationDays(formDays)})
          </button>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn" disabled={busy || (!dirty && saved.length > 0)} onClick={() => void save()}>
          {busy ? tx("Kaydediliyor…") : days.length ? `${tx("Günleri kaydet")} · ${formatParticipationDays(days)}` : tx("Günleri kaydet")}
        </button>
        {onCancel ? <button type="button" className="btn ghost" onClick={onCancel}>{tx("Vazgeç")}</button> : null}
        {!days.length ? <span className="text-xs text-[#c2410c]">{tx("Gün seçmezseniz takviminiz tamamen kapalı kalır.")}</span> : null}
        {msg ? <span className="text-sm text-[#22A34A]">{msg}</span> : null}
        {error ? <span className="text-sm text-[#E31C23]">{error}</span> : null}
      </div>
    </div>
  );
}
