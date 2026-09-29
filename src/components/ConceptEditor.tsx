"use client";

import { CONCEPT_FIELDS, type SessionConcept } from "@/lib/session-concept";

export function ConceptEditor({
  summary,
  concept,
  onSummary,
  onConcept,
}: {
  summary: string;
  concept: SessionConcept;
  onSummary: (value: string) => void;
  onConcept: (value: SessionConcept) => void;
}) {
  return (
    <div className="space-y-3 md:col-span-6">
      <label className="text-sm block">
        Özet
        <span className="block text-xs text-[#57534e] mb-1">Ziyaretçi önce bunu okur. Kısa tutun; yaklaşık 300 kelimeyi geçmeyin.</span>
        <textarea className="field" rows={6} value={summary} onChange={(e) => onSummary(e.target.value)} placeholder="Oturumun kısa özeti" />
      </label>
      <details className="border border-[#B5DFF2] bg-white" open>
        <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-[#0077C2]">Detaylı konsept notu</summary>
        <div className="grid gap-3 p-3 border-t border-[#DCE8F0]">
          <p className="text-xs text-[#57534e]">
            Green Zone konsept notu gibi doldurun. Kişi detaya girince bu bölümler amaç, soru, akış, kitle, sonuç ve kaynak olarak önüne açılır.
          </p>
          {CONCEPT_FIELDS.map((field) => (
            <label key={field.key} className="text-sm block">
              {field.label}
              {field.hint ? <span className="block text-xs text-[#57534e]">{field.hint}</span> : null}
              <textarea
                className="field mt-1"
                rows={field.key === "titleEn" || field.key === "organiser" || field.key === "themePrimary" ? 2 : 5}
                value={concept[field.key]}
                onChange={(e) => onConcept({ ...concept, [field.key]: e.target.value })}
              />
            </label>
          ))}
        </div>
      </details>
    </div>
  );
}
