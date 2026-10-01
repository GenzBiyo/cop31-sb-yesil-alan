"use client";

import { useState } from "react";
import { CONCEPT_FIELDS, conceptHasDetail, flowRows, GUEST_ROLE_LABELS, type SessionConcept } from "@/lib/session-concept";
import { useI18n } from "@/components/I18nProvider";

export type BriefGuest = { name: string; title?: string; organization?: string; role?: string };

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

function Copy({ text }: { text: string }) {
  return (
    <div className="concept-copy">
      {blocks(text).map((block, i) =>
        block.type === "ul" ? (
          <ul key={i}>{block.text.map((line) => <li key={line}>{line}</li>)}</ul>
        ) : (
          <p key={i}>{block.text[0]}</p>
        )
      )}
    </div>
  );
}

export function SessionBrief({
  summary,
  concept,
  startOpen = false,
  tone = "page",
  lineup = [],
}: {
  summary: string;
  concept: SessionConcept;
  startOpen?: boolean;
  tone?: "page" | "phone";
  lineup?: BriefGuest[];
}) {
  const { tx } = useI18n();
  const [open, setOpen] = useState(startOpen);
  const guests = lineup.filter((g) => g.name.trim());
  const detailed = conceptHasDetail(concept) || guests.length > 0;
  if (!summary.trim() && !detailed) return null;
  const phone = tone === "phone";
  const flow = flowRows(concept);
  const total = flow.reduce((n, r) => n + r.minutes, 0);

  return (
    <section className={phone ? "concept-sheet is-phone" : "card p-5 concept-sheet"}>
      {summary.trim() ? (
        <div>
          <p className="concept-kicker">{tx("Kısa özet")}</p>
          <Copy text={summary} />
        </div>
      ) : null}
      {detailed ? (
        <>
          <button type="button" className={`${phone ? "phone-btn is-quiet" : "btn ghost"} no-print`} onClick={() => setOpen((v) => !v)}>
            {open ? tx("Detayı kapat") : tx("Detaylı içeriği oku")}
          </button>
          {open ? (
            <div className="concept-body">
              {CONCEPT_FIELDS.map((field) => {
                if (field.key === "speakers" && guests.length) {
                  return (
                    <article key={field.key} className="concept-block">
                      <h3>{tx(field.label)}</h3>
                      <div className="concept-copy">
                        <ul>
                          {guests.map((g, i) => (
                            <li key={`${g.name}-${i}`}>
                              <strong>{g.name}</strong>
                              {[g.title, g.organization].filter(Boolean).length ? ` — ${[g.title, g.organization].filter(Boolean).join(", ")}` : ""}
                              {g.role && GUEST_ROLE_LABELS[g.role] ? ` · ${tx(GUEST_ROLE_LABELS[g.role])}` : ""}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </article>
                  );
                }
                if (field.key === "format" && flow.length) {
                  return (
                    <article key={field.key} className="concept-block">
                      <h3>{tx(field.label)}</h3>
                      <div className="concept-copy">
                        <ul>
                          {flow.map((r, i) => (
                            <li key={i}>
                              <strong>{r.minutes ? `${r.minutes} dk` : "—"}</strong> · {r.title}
                              {r.who ? ` — ${r.who}` : ""}
                            </li>
                          ))}
                        </ul>
                        {total ? <p>{tx("Toplam")}: {total} dk</p> : null}
                      </div>
                      {concept.format.trim() ? <Copy text={concept.format} /> : null}
                    </article>
                  );
                }
                const value = concept[field.key].trim();
                if (!value) return null;
                return (
                  <article key={field.key} className="concept-block">
                    <h3>{tx(field.label)}</h3>
                    <Copy text={value} />
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
