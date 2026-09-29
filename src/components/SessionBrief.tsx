"use client";

import { useState } from "react";
import { CONCEPT_FIELDS, conceptHasDetail, type SessionConcept } from "@/lib/session-concept";
import { useI18n } from "@/components/I18nProvider";

function blocks(text: string) {
  const lines = text.replace(/\r/g, "").split("\n");
  const out: { type: "p" | "ul"; text: string[] }[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const bullet = /^[-•]\s+/.test(trimmed);
    const last = out[out.length - 1];
    if (bullet && last?.type === "ul") last.text.push(trimmed.replace(/^[-•]\s+/, ""));
    else if (bullet) out.push({ type: "ul", text: [trimmed.replace(/^[-•]\s+/, "")] });
    else out.push({ type: "p", text: [trimmed] });
  }
  return out;
}

export function SessionBrief({
  summary,
  concept,
  startOpen = false,
  tone = "page",
}: {
  summary: string;
  concept: SessionConcept;
  startOpen?: boolean;
  tone?: "page" | "phone";
}) {
  const { tx } = useI18n();
  const [open, setOpen] = useState(startOpen);
  const detailed = conceptHasDetail(concept);
  if (!summary.trim() && !detailed) return null;
  const phone = tone === "phone";

  return (
    <section className={phone ? "concept-sheet is-phone" : "card p-5 concept-sheet"}>
      {summary.trim() ? (
        <div>
          <p className="concept-kicker">{tx("Kısa özet")}</p>
          <div className="concept-copy">
            {blocks(summary).map((block, i) =>
              block.type === "ul" ? (
                <ul key={i}>{block.text.map((line) => <li key={line}>{line}</li>)}</ul>
              ) : (
                <p key={i}>{block.text[0]}</p>
              )
            )}
          </div>
        </div>
      ) : null}
      {detailed ? (
        <>
          <button type="button" className={phone ? "phone-btn is-quiet" : "btn ghost"} onClick={() => setOpen((v) => !v)}>
            {open ? tx("Detayı kapat") : tx("Detaylı içeriği oku")}
          </button>
          {open ? (
            <div className="concept-body">
              {CONCEPT_FIELDS.map((field) => {
                const value = concept[field.key].trim();
                if (!value) return null;
                return (
                  <article key={field.key} className="concept-block">
                    <h3>{tx(field.label)}</h3>
                    <div className="concept-copy">
                      {blocks(value).map((block, i) =>
                        block.type === "ul" ? (
                          <ul key={i}>{block.text.map((line) => <li key={line}>{line}</li>)}</ul>
                        ) : (
                          <p key={i}>{block.text[0]}</p>
                        )
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
