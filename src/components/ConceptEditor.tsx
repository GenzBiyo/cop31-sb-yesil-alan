"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Check, Plus, Trash2 } from "lucide-react";
import {
  CONCEPT_FIELDS,
  CONCEPT_SECTIONS,
  conceptCompletion,
  flowRows,
  type ConceptKey,
  type FlowRow,
  type SessionConcept,
} from "@/lib/session-concept";

const FIELD = new Map(CONCEPT_FIELDS.map((f) => [f.key, f]));
const SHORT: ConceptKey[] = ["titleEn", "organiser", "themePrimary"];
const FLOW_PRESET: FlowRow[] = [
  { minutes: 5, title: "Açılış ve karşılama", who: "" },
  { minutes: 10, title: "Sunum", who: "" },
  { minutes: 35, title: "Panel tartışması", who: "" },
  { minutes: 10, title: "Soru-cevap", who: "" },
  { minutes: 5, title: "Kapanış", who: "" },
];

export function ConceptEditor({
  summary,
  concept,
  onSummary,
  onConcept,
  lineupNames = [],
  sessionMinutes = 0,
}: {
  summary: string;
  concept: SessionConcept;
  onSummary: (value: string) => void;
  onConcept: (value: SessionConcept) => void;
  lineupNames?: string[];
  sessionMinutes?: number;
}) {
  const [step, setStep] = useState(CONCEPT_SECTIONS[0].id);
  const completion = conceptCompletion(concept);
  const section = CONCEPT_SECTIONS.find((s) => s.id === step) || CONCEPT_SECTIONS[0];
  const index = CONCEPT_SECTIONS.indexOf(section);
  const words = summary.trim() ? summary.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-3 md:col-span-6">
      <label className="text-sm block">
        Özet
        <span className="block text-xs text-[#57534e] mb-1">
          Ziyaretçi önce bunu okur. Kısa tutun; yaklaşık 300 kelimeyi geçmeyin. ({words} kelime)
        </span>
        <textarea className="field" rows={6} value={summary} onChange={(e) => onSummary(e.target.value)} placeholder="Oturumun kısa özeti" />
      </label>

      <div className="border border-[#B5DFF2] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-[#DCE8F0]">
          <span className="text-sm font-semibold text-[#0077C2]">Detaylı konsept notu</span>
          <span className="text-xs text-[#57534e]">
            Doluluk <strong className="text-[#00796B]">%{completion.percent}</strong>
          </span>
        </div>
        <div className="h-1 bg-[#EAF2F8]">
          <div className="h-1 bg-[#22A34A] transition-all" style={{ width: `${completion.percent}%` }} />
        </div>
        <nav className="flex flex-wrap gap-1 p-2 border-b border-[#DCE8F0]" aria-label="Konsept bölümleri">
          {CONCEPT_SECTIONS.map((s, i) => {
            const state = completion.sections[i];
            const active = s.id === section.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setStep(s.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border ${
                  active ? "border-[#0077C2] bg-[#EAF6FC] text-[#0B1C33]" : "border-transparent text-[#57534e] hover:bg-[#F3F8FB]"
                }`}
              >
                <span
                  className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold ${
                    state.done ? "bg-[#22A34A] text-white" : state.filled ? "bg-[#B5DFF2] text-[#0B1C33]" : "bg-[#EAF2F8] text-[#57534e]"
                  }`}
                >
                  {state.done ? <Check size={12} /> : i + 1}
                </span>
                {s.label}
                <span className="text-[11px] text-[#57534e]">{state.filled}/{state.total}</span>
              </button>
            );
          })}
        </nav>

        <div className="grid gap-3 p-3">
          <p className="text-xs text-[#57534e]">{section.intro}</p>
          {section.id === "akis" ? (
            <FlowEditor concept={concept} onConcept={onConcept} lineupNames={lineupNames} sessionMinutes={sessionMinutes} />
          ) : null}
          {section.keys.map((key) => {
            const field = FIELD.get(key)!;
            const label = key === "format" ? "Akış notu (isteğe bağlı)" : field.label;
            const hint = key === "format" ? "Oturum biçimi, sahne düzeni veya akışla ilgili ek bilgi" : field.hint;
            return (
              <label key={key} className="text-sm block">
                {label}
                {hint ? <span className="block text-xs text-[#57534e]">{hint}</span> : null}
                <textarea
                  className="field mt-1"
                  rows={SHORT.includes(key) ? 2 : key === "format" ? 3 : 5}
                  value={concept[key]}
                  onChange={(e) => onConcept({ ...concept, [key]: e.target.value })}
                />
              </label>
            );
          })}
          {section.id === "kimlik" ? (
            <p className="text-xs text-[#57534e]">Konuşmacılar ve rolleri yukarıdaki konuşmacı listesinden otomatik alınır.</p>
          ) : null}
          <div className="flex justify-between gap-2 pt-1">
            <button
              type="button"
              className="btn ghost"
              disabled={index === 0}
              onClick={() => setStep(CONCEPT_SECTIONS[index - 1].id)}
            >
              ← Önceki
            </button>
            <button
              type="button"
              className="btn ghost"
              disabled={index === CONCEPT_SECTIONS.length - 1}
              onClick={() => setStep(CONCEPT_SECTIONS[index + 1].id)}
            >
              Sonraki →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FlowEditor({
  concept,
  onConcept,
  lineupNames,
  sessionMinutes,
}: {
  concept: SessionConcept;
  onConcept: (value: SessionConcept) => void;
  lineupNames: string[];
  sessionMinutes: number;
}) {
  const rows = flowRows(concept);
  const total = rows.reduce((n, r) => n + r.minutes, 0);
  const listId = "flow-who-options";

  function save(next: FlowRow[]) {
    onConcept({ ...concept, flow: next.length ? JSON.stringify(next) : "" });
  }
  function patch(i: number, part: Partial<FlowRow>) {
    save(rows.map((r, idx) => (idx === i ? { ...r, ...part } : r)));
  }
  function move(i: number, dir: -1 | 1) {
    const next = [...rows];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    save(next);
  }

  return (
    <div className="space-y-2">
      <datalist id={listId}>
        {lineupNames.map((n) => <option key={n} value={n} />)}
      </datalist>
      {rows.length === 0 ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-[#57534e]">
          Henüz akış yok.
          <button type="button" className="btn ghost" onClick={() => save(FLOW_PRESET)}>Standart akışla başla</button>
        </div>
      ) : null}
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[4.5rem_1fr_1fr_auto] gap-2 items-center">
          <label className="flex items-center gap-1 text-xs text-[#57534e]">
            <input
              className="field px-2"
              type="number"
              min={0}
              max={240}
              value={r.minutes || ""}
              onChange={(e) => patch(i, { minutes: Number(e.target.value) })}
              aria-label="Süre (dk)"
            />
            dk
          </label>
          <input className="field" placeholder="Bölüm (ör. Açılış)" value={r.title} onChange={(e) => patch(i, { title: e.target.value })} />
          <input className="field" placeholder="Kim? (isteğe bağlı)" list={listId} value={r.who} onChange={(e) => patch(i, { who: e.target.value })} />
          <span className="flex">
            <button type="button" className="btn ghost px-2" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Yukarı"><ArrowUp size={14} /></button>
            <button type="button" className="btn ghost px-2" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="Aşağı"><ArrowDown size={14} /></button>
            <button type="button" className="btn ghost px-2" onClick={() => save(rows.filter((_, idx) => idx !== i))} aria-label="Sil"><Trash2 size={14} /></button>
          </span>
        </div>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" className="btn ghost" onClick={() => save([...rows, { minutes: 10, title: "", who: "" }])}>
          <Plus size={14} /> Bölüm ekle
        </button>
        {rows.length ? (
          <span className="text-sm">
            Toplam <strong>{total} dk</strong>
            {sessionMinutes > 0 && total !== sessionMinutes ? (
              <span className="text-[#c2410c]"> · oturum {sessionMinutes} dk</span>
            ) : sessionMinutes > 0 ? (
              <span className="text-[#22A34A]"> · oturum süresiyle aynı</span>
            ) : null}
          </span>
        ) : null}
      </div>
    </div>
  );
}
