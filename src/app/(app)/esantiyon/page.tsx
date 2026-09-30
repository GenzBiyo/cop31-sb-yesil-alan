"use client";

import { useState } from "react";
import { api, useApi } from "@/lib/client";
import { useI18n } from "@/components/I18nProvider";

type Me = { role: string; companyId: string | null };
type Row = {
  id: string;
  type: string;
  title: string;
  payload: string;
  quantity?: string;
  reviewNote?: string;
  status: string;
  attachment?: string;
  linkUrl?: string;
};
type Company = { id: string; submissions: Row[] };
type Item = Row & { company: { name: string; booth: string } };

const KINDS = [
  { id: "esantiyon", label: "Eşantiyon" },
  { id: "ikram", label: "İkram" },
];

export default function GiveawayPage() {
  const { tx } = useI18n();
  const { data: me } = useApi<Me>("/api/auth/me");
  const manager = me?.role === "ADMIN" || me?.role === "SAGLIK";
  const { data: companies, reload: reloadCompany } = useApi<Company[]>(me && !manager ? "/api/companies" : null);
  const { data: queue, reload: reloadQueue } = useApi<Item[]>(manager ? "/api/submissions" : null);
  const [item, setItem] = useState({ type: "esantiyon", title: "", quantity: "", payload: "", linkUrl: "" });
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const mine = (companies?.[0]?.submissions || []).filter((row) => KINDS.some((kind) => kind.id === row.type));
  const rows = (queue || []).filter((row) => KINDS.some((kind) => kind.id === row.type));
  if (!me) return <p>{tx("Yükleniyor…")}</p>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="display text-4xl">{tx("Eşantiyon ve İkram")}</h1>
        <p className="text-[#57534e]">
          {tx("Dağıtım, alan planındaki bilgilendirme standından (12) ve resepsiyon masasından (2) yapılır. Uygun kararı almayan hiçbir eşantiyon veya ikram bu noktalardan çıkmaz.")}
        </p>
      </div>
      {error ? <p className="text-sm text-[#E31C23]">{tx(error)}</p> : null}
      {!manager ? (
        <section className="card p-4 space-y-3">
          <h2 className="display text-2xl">{tx("Dağıtılacak eşantiyon veya ikram")}</h2>
          <p className="text-sm text-[#57534e]">{tx("Resim, PDF veya bağlantı ekleyin.")}</p>
          <div className="grid md:grid-cols-4 gap-2">
            <select className="field" value={item.type} onChange={(e) => setItem({ ...item, type: e.target.value })}>
              {KINDS.map((kind) => <option key={kind.id} value={kind.id}>{tx(kind.label)}</option>)}
            </select>
            <input className="field md:col-span-2" placeholder={tx("Tanım")} value={item.title} onChange={(e) => setItem({ ...item, title: e.target.value })} />
            <input className="field" placeholder={tx("Adet")} value={item.quantity} onChange={(e) => setItem({ ...item, quantity: e.target.value })} />
            <textarea className="field md:col-span-4" placeholder={tx("Ne, hangi malzeme, nasıl dağıtılacak")} value={item.payload} onChange={(e) => setItem({ ...item, payload: e.target.value })} />
            <label className="text-sm md:col-span-2">
              {tx("Görsel yükle")}
              <input
                className="field mt-1"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,.pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
            <label className="text-sm md:col-span-2">
              {tx("Bağlantı")}
              <input className="field mt-1" placeholder="https://" value={item.linkUrl} onChange={(e) => setItem({ ...item, linkUrl: e.target.value })} />
            </label>
            <button
              className="btn"
              onClick={async () => {
                setError("");
                const body = new FormData();
                body.append("type", item.type);
                body.append("title", item.title);
                body.append("quantity", item.quantity);
                body.append("payload", item.payload);
                body.append("linkUrl", item.linkUrl);
                if (file) body.append("file", file);
                try {
                  await api("/api/submissions", { method: "POST", body });
                  setItem({ type: item.type, title: "", quantity: "", payload: "", linkUrl: "" });
                  setFile(null);
                  await reloadCompany();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Kayıt alınamadı");
                }
              }}
            >
              {tx("Onaya gönder")}
            </button>
          </div>
          <ul className="space-y-2">
            {mine.map((row) => (
              <li key={row.id} className="border-b border-[#DCE8F0] pb-2 text-sm">
                <div className="flex justify-between gap-2">
                  <div>
                    <span className="badge muted">{tx(KINDS.find((kind) => kind.id === row.type)?.label || row.type)}</span>{" "}
                    <strong>{row.title}</strong> · {row.quantity}
                  </div>
                  <span className={`badge ${row.status === "Uygun" ? "ok" : row.status === "Uygun değil" ? "high" : "warn"}`}>{tx(row.status)}</span>
                </div>
                {row.payload ? <div className="text-[#57534e] mt-1">{row.payload}</div> : null}
                <Media row={row} />
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
                  <div className="text-xs uppercase text-[#0077C2]">{tx(KINDS.find((kind) => kind.id === row.type)?.label || row.type)} · {row.quantity}</div>
                  <h2 className="display text-2xl">{row.title}</h2>
                  <p className="text-sm text-[#57534e]">{row.company.name}{row.company.booth ? ` · ${row.company.booth}` : ""}</p>
                </div>
                <span className={`badge ${row.status === "Uygun" ? "ok" : row.status === "Uygun değil" ? "high" : "warn"}`}>{tx(row.status)}</span>
              </div>
              {row.payload ? <p className="text-sm">{row.payload}</p> : null}
              <Media row={row} />
              <textarea
                className="field"
                rows={2}
                value={notes[row.id] ?? row.reviewNote}
                onChange={(e) => setNotes({ ...notes, [row.id]: e.target.value })}
                placeholder={tx("Gerekçe")}
              />
              <div className="flex gap-2">
                <button className="btn" onClick={() => decide(row.id, "Uygun", (notes[row.id] ?? row.reviewNote) || "", reloadQueue, setError)}>{tx("Uygun")}</button>
                <button className="btn ghost" onClick={() => decide(row.id, "Uygun değil", (notes[row.id] ?? row.reviewNote) || "", reloadQueue, setError)}>{tx("Uygun değil")}</button>
              </div>
            </article>
          ))}
          {rows.length === 0 ? <p className="text-sm text-[#57534e]">{tx("Henüz başvuru yok.")}</p> : null}
        </div>
      )}
    </div>
  );
}

function Media({ row }: { row: { attachment?: string; linkUrl?: string } }) {
  const file = row.attachment || "";
  const image = /\.(png|jpe?g|webp|gif)$/i.test(file);
  const pdf = /\.pdf$/i.test(file);
  if (!file && !row.linkUrl) return null;
  return (
    <div className="mt-2 space-y-2">
      {image ? <img src={file} alt="" className="max-h-40 w-auto border border-[#DCE8F0]" /> : null}
      {pdf ? <a className="text-[#0077C2] underline" href={file} target="_blank" rel="noreferrer">PDF</a> : null}
      {row.linkUrl ? <a className="text-[#0077C2] underline block break-all" href={row.linkUrl} target="_blank" rel="noreferrer">{row.linkUrl}</a> : null}
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
