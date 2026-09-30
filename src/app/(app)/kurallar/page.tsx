"use client";

import { useEffect, useState } from "react";
import { api, useApi } from "@/lib/client";
import { useI18n } from "@/components/I18nProvider";
import { RulesArticle } from "@/components/PavilionRules";

export default function RulesPage() {
  const { tx } = useI18n();
  const { data } = useApi<{ role: string }>("/api/auth/me");
  const canEdit = data?.role === "ADMIN" || data?.role === "SAGLIK";
  const [body, setBody] = useState("");
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/pavilion-rules")
      .then((r) => r.json())
      .then((payload) => setBody(payload.body || ""))
      .catch(() => setError("Kurallar yüklenemedi"));
  }, []);

  async function save() {
    setError("");
    setSaved("");
    try {
      const next = await api<{ body: string }>("/api/pavilion-rules", {
        method: "PUT",
        body: JSON.stringify({ body }),
      });
      setBody(next.body);
      setSaved("Kaydedildi");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydedilemedi");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between gap-3 flex-wrap">
        <div>
          <h1 className="display text-4xl">{tx("Pavilyon Kullanım Kuralları")}</h1>
          <p className="text-[#57534e]">
            {canEdit
              ? tx("Bu metin firmaların ekranında ve indirecekleri PDF’te görünür. Admin ve Sağlık Bakanlığı değiştirebilir.")
              : tx("Pavilyondaki etkinlik, stand, ekran, eşantiyon, ikram ve marka kullanımı bu kurallara bağlıdır.")}
          </p>
        </div>
        <a className="btn" href="/api/pdf/pavilion-kurallar">{tx("PDF indir")}</a>
      </div>
      {canEdit ? (
        <div className="grid xl:grid-cols-2 gap-4">
          <section className="card p-4 space-y-3">
            <textarea className="field font-mono text-sm min-h-[70vh]" value={body} onChange={(e) => setBody(e.target.value)} />
            <div className="flex gap-3 items-center">
              <button className="btn" onClick={() => void save()}>{tx("Kaydet")}</button>
              {saved ? <span className="text-sm text-[#0077C2]">{tx(saved)}</span> : null}
              {error ? <span className="text-sm text-[#E31C23]">{tx(error)}</span> : null}
            </div>
          </section>
          <section className="card p-5">
            <RulesArticle text={body} />
          </section>
        </div>
      ) : (
        <section className="card p-5 md:p-8">
          {body ? <RulesArticle text={body} /> : <p>{tx("Yükleniyor…")}</p>}
        </section>
      )}
    </div>
  );
}
