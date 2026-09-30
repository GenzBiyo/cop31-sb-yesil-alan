"use client";

import { useState } from "react";
import { api, useApi } from "@/lib/client";
import { useI18n } from "@/components/I18nProvider";

type Me = { role: string; companyId: string | null };
type Company = {
  id: string;
  submissions: { id: string; type: string; title: string; payload: string; quantity?: string; reviewNote?: string; status: string }[];
};
type Item = {
  id: string;
  title: string;
  payload: string;
  quantity: string;
  reviewNote: string;
  status: string;
  company: { name: string; booth: string };
};

export default function GiveawayPage() {
  const { tx } = useI18n();
  const { data: me } = useApi<Me>("/api/auth/me");
  const manager = me?.role === "ADMIN" || me?.role === "SAGLIK";
  const { data: companies, reload: reloadCompany } = useApi<Company[]>(me && !manager ? "/api/companies" : null);
  const { data: queue, reload: reloadQueue } = useApi<Item[]>(manager ? "/api/submissions" : null);
  const [item, setItem] = useState({ title: "", quantity: "", payload: "" });
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const mine = (companies?.[0]?.submissions || []).filter((row) => row.type === "esantiyon");
  const rows = (queue || []).filter((row) => row.type === "esantiyon");
  if (!me) return <p>{tx("Yükleniyor…")}</p>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="display text-4xl">{tx("Eşantiyon")}</h1>
        <p className="text-[#57534e]">
          {tx("Dağıtım, alan planındaki bilgilendirme standından (12) ve resepsiyon masasından (2) yapılır. Uygun kararı almayan hiçbir eşantiyon bu noktalardan çıkmaz.")}
        </p>
      </div>
      {error ? <p className="text-sm text-[#E31C23]">{tx(error)}</p> : null}
      {!manager ? (
        <section className="card p-4 space-y-3">
          <h2 className="display text-2xl">{tx("Dağıtılacak eşantiyon")}</h2>
          <div className="grid md:grid-cols-4 gap-2">
            <input className="field md:col-span-2" placeholder={tx("Tanım")} value={item.title} onChange={(e) => setItem({ ...item, title: e.target.value })} />
            <input className="field" placeholder={tx("Adet")} value={item.quantity} onChange={(e) => setItem({ ...item, quantity: e.target.value })} />
            <button
              className="btn"
              onClick={async () => {
                setError("");
                try {
                  await api("/api/submissions", {
                    method: "POST",
                    body: JSON.stringify({ type: "esantiyon", ...item }),
                  });
                  setItem({ title: "", quantity: "", payload: "" });
                  await reloadCompany();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Kayıt alınamadı");
                }
              }}
            >
              {tx("Onaya gönder")}
            </button>
            <textarea className="field md:col-span-4" placeholder={tx("Ne, hangi malzeme, nasıl dağıtılacak")} value={item.payload} onChange={(e) => setItem({ ...item, payload: e.target.value })} />
          </div>
          <ul className="space-y-2">
            {mine.map((row) => (
              <li key={row.id} className="border-b border-[#DCE8F0] pb-2 text-sm">
                <div className="flex justify-between gap-2">
                  <div><strong>{row.title}</strong> · {row.quantity}</div>
                  <span className={`badge ${row.status === "Uygun" ? "ok" : row.status === "Uygun değil" ? "high" : "warn"}`}>{tx(row.status)}</span>
                </div>
                {row.payload ? <div className="text-[#57534e] mt-1">{row.payload}</div> : null}
                {row.status !== "Uygun" ? <div className="text-xs text-[#E31C23] mt-1">{tx("Bu kayıt dağıtılamaz.")}</div> : null}
              </li>
            ))}
            {mine.length === 0 ? <li className="text-sm text-[#57534e]">{tx("Henüz başvuru yok.")}</li> : null}
          </ul>
        </section>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <article key={row.id} className="card p-4 space-y-2">
              <div className="flex justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-xs uppercase text-[#0077C2]">{row.quantity}</div>
                  <h2 className="display text-2xl">{row.title}</h2>
                  <p className="text-sm text-[#57534e]">{row.company.name}{row.company.booth ? ` · ${row.company.booth}` : ""}</p>
                </div>
                <span className={`badge ${row.status === "Uygun" ? "ok" : row.status === "Uygun değil" ? "high" : "warn"}`}>{tx(row.status)}</span>
              </div>
              {row.payload ? <p className="text-sm">{row.payload}</p> : null}
              <textarea
                className="field"
                rows={2}
                value={notes[row.id] ?? row.reviewNote}
                onChange={(e) => setNotes({ ...notes, [row.id]: e.target.value })}
                placeholder={tx("Gerekçe")}
              />
              <div className="flex gap-2">
                <button className="btn" onClick={() => decide(row.id, "Uygun", notes[row.id] ?? row.reviewNote, reloadQueue, setError)}>{tx("Uygun")}</button>
                <button className="btn ghost" onClick={() => decide(row.id, "Uygun değil", notes[row.id] ?? row.reviewNote, reloadQueue, setError)}>{tx("Uygun değil")}</button>
              </div>
            </article>
          ))}
          {rows.length === 0 ? <p className="text-sm text-[#57534e]">{tx("Henüz başvuru yok.")}</p> : null}
        </div>
      )}
    </div>
  );
}

async function decide(
  id: string,
  status: "Uygun" | "Uygun değil",
  reviewNote: string,
  reload: () => Promise<void>,
  setError: (value: string) => void,
) {
  setError("");
  try {
    await api("/api/submissions", { method: "PATCH", body: JSON.stringify({ id, status, reviewNote }) });
    await reload();
  } catch (err) {
    setError(err instanceof Error ? err.message : "Karar kaydedilemedi");
  }
}
