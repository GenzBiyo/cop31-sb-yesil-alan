"use client";

import { useState } from "react";
import { api, useApi } from "@/lib/client";
import { useI18n } from "@/components/I18nProvider";

type Item = {
  id: string;
  type: string;
  title: string;
  payload: string;
  quantity: string;
  reviewNote: string;
  status: string;
  company: { id: string; name: string; booth: string };
};

const TYPE_LABEL: Record<string, string> = {
  etkinlik: "Etkinlik / sunum",
  ikram: "İkram",
  esantiyon: "Eşantiyon",
};

export default function CompliancePage() {
  const { tx } = useI18n();
  const { data, reload } = useApi<Item[]>("/api/submissions");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  async function decide(item: Item, status: "Uygun" | "Uygun değil") {
    setError("");
    const reviewNote = notes[item.id] ?? item.reviewNote;
    try {
      await api("/api/submissions", {
        method: "PATCH",
        body: JSON.stringify({ id: item.id, status, reviewNote }),
      });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Karar kaydedilemedi");
    }
  }

  const rows = data || [];
  const waiting = rows.filter((item) => item.status === "Onay bekliyor");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="display text-4xl">{tx("Uygunluk")}</h1>
        <p className="text-[#57534e]">
          {tx("Firma etkinlik, ikram ve eşantiyon kayıtlarını adet ve tanımla sunar. Yalnızca Uygun kararı alanlar pavilyonda dağıtılabilir veya ikram edilebilir.")}
        </p>
      </div>
      {error ? <p className="text-sm text-[#E31C23]">{tx(error)}</p> : null}
      <p className="text-sm text-[#0077C2]">{waiting.length} {tx("kayıt onay bekliyor")}</p>
      <div className="space-y-3">
        {rows.map((item) => (
          <article key={item.id} className="card p-4 space-y-3">
            <div className="flex justify-between gap-3 flex-wrap">
              <div>
                <div className="text-xs tracking-[0.14em] uppercase text-[#0077C2]">{tx(TYPE_LABEL[item.type] || item.type)} · {item.quantity}</div>
                <h2 className="display text-2xl">{item.title}</h2>
                <p className="text-sm text-[#57534e]">{item.company.name}{item.company.booth ? ` · Stant ${item.company.booth}` : ""}</p>
              </div>
              <span className={`badge ${item.status === "Uygun" ? "ok" : item.status === "Uygun değil" ? "high" : "warn"}`}>{tx(item.status)}</span>
            </div>
            {item.payload ? <p className="text-sm">{item.payload}</p> : null}
            <label className="text-sm block">
              {tx("Gerekçe")}
              <textarea
                className="field mt-1"
                rows={2}
                value={notes[item.id] ?? item.reviewNote}
                onChange={(e) => setNotes({ ...notes, [item.id]: e.target.value })}
              />
            </label>
            <div className="flex gap-2">
              <button className="btn" onClick={() => void decide(item, "Uygun")}>{tx("Uygun")}</button>
              <button className="btn ghost" onClick={() => void decide(item, "Uygun değil")}>{tx("Uygun değil")}</button>
            </div>
          </article>
        ))}
        {rows.length === 0 ? <p className="text-sm text-[#57534e]">{tx("Henüz başvuru yok.")}</p> : null}
      </div>
    </div>
  );
}
