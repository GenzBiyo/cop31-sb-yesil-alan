"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";

function inline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <span key={i}>{part}</span>
  );
}

export function RulesArticle({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const intro: string[] = [];
  const sections: { title: string; lines: string[] }[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith("# ")) {
      sections.push({ title: line.slice(2), lines: [] });
    } else if (sections.length) {
      sections[sections.length - 1].lines.push(raw);
    } else {
      intro.push(raw);
    }
  }
  if (!intro.some((line) => line.trim()) && sections.length > 1) {
    const title = sections.shift()!;
    intro.push(`# ${title.title}`, ...title.lines);
  }
  return (
    <article className="space-y-3">
      {renderBlocks(intro)}
      {sections.length ? (
        <div className="border-t border-[#B5DFF2]">
          {sections.map((section, i) => (
            <details key={`${i}-${section.title}`} className="group border-b border-[#B5DFF2]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3 [&::-webkit-details-marker]:hidden">
                <span className="display text-2xl text-[#0B1C33]">{section.title}</span>
                <ChevronDown size={20} className="shrink-0 text-[#0077C2] transition-transform group-open:rotate-180" />
              </summary>
              <div className="space-y-3 pb-4">{renderBlocks(section.lines)}</div>
            </details>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function renderBlocks(lines: string[]) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  let table: string[][] = [];

  function flushList() {
    if (!list.length) return;
    const items = list;
    list = [];
    blocks.push(
      <ul key={`l-${blocks.length}`} className="list-disc pl-5 space-y-1 text-sm text-[#1c1917]">
        {items.map((item, i) => <li key={i}>{inline(item)}</li>)}
      </ul>
    );
  }

  function flushTable() {
    if (!table.length) return;
    const rows = table.filter((row) => !row.every((cell) => /^[-:\s]+$/.test(cell)));
    table = [];
    if (!rows.length) return;
    const [head, ...body] = rows;
    blocks.push(
      <div key={`t-${blocks.length}`} className="overflow-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>{head.map((cell, i) => <th key={i} className="text-left border-b border-[#B5DFF2] py-2 pr-3">{cell}</th>)}</tr>
          </thead>
          <tbody>
            {body.map((row, r) => (
              <tr key={r}>{row.map((cell, i) => <td key={i} className="border-b border-[#EAF2F8] py-2 pr-3">{cell}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith("|")) {
      flushList();
      table.push(line.split("|").slice(1, -1).map((cell) => cell.trim()));
      continue;
    }
    flushTable();
    if (!line) {
      flushList();
      continue;
    }
    if (line.startsWith("- ")) {
      list.push(line.slice(2));
      continue;
    }
    flushList();
    if (line.startsWith("# ")) {
      blocks.push(<h2 key={`h-${blocks.length}`} className="display text-3xl text-[#0B1C33]">{line.slice(2)}</h2>);
    } else if (line.startsWith("## ")) {
      blocks.push(<h3 key={`h-${blocks.length}`} className="display text-2xl text-[#0077C2]">{line.slice(3)}</h3>);
    } else {
      blocks.push(<p key={`p-${blocks.length}`} className="text-sm leading-6 text-[#1c1917]">{inline(line)}</p>);
    }
  }
  flushList();
  flushTable();
  return blocks;
}

export function PavilionRulesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { tx } = useI18n();
  const [body, setBody] = useState("");

  useEffect(() => {
    if (!open) return;
    let stop = false;
    fetch("/api/pavilion-rules")
      .then((r) => r.json())
      .then((data) => {
        if (!stop) setBody(data.body || "");
      })
      .catch(() => undefined);
    return () => {
      stop = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-[#0B1C33]/50 p-4 md:p-8 overflow-auto" role="dialog" aria-modal="true" aria-labelledby="pavilion-rules-title">
      <div className="card max-w-3xl mx-auto p-5 md:p-8 space-y-4 bg-white">
        <div className="flex justify-between gap-3 flex-wrap items-start">
          <h2 id="pavilion-rules-title" className="display text-3xl">{tx("Pavilyon Kullanım Kuralları")}</h2>
          <div className="flex gap-2">
            <a className="btn" href="/api/pdf/pavilion-kurallar">{tx("PDF indir")}</a>
            <button type="button" className="btn ghost" onClick={onClose}>{tx("Kapat")}</button>
          </div>
        </div>
        <p className="text-sm text-[#57534e]">{tx("Okumak istediğiniz başlığa basın. Kuralların tamamı PDF’te.")}</p>
        {body ? <RulesArticle text={body} /> : <p className="text-sm text-[#57534e]">{tx("Yükleniyor…")}</p>}
      </div>
    </div>
  );
}
