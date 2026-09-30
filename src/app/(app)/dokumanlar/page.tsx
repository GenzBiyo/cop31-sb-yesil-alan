"use client";

import { useState } from "react";
import { api, useApi } from "@/lib/client";
import { useI18n } from "@/components/I18nProvider";

const DOCS = [
  { slug: "program", title: "Pavilion programı", text: "12 günlük takvim, etkinlikler ve konuşmalar." },
  { slug: "etkinlikler", title: "Etkinlikler ve paneller", text: "Panel başlıkları, paydaşlar, panelist ve moderatör listesi." },
  { slug: "pavilion-kurallar", title: "Pavilyon kullanım kuralları", text: "Paydaş katılım, stant, ekran, eşantiyon, ikram ve marka kuralları." },
  { slug: "alan-plani", title: "Alan planı", text: "Fuar standı ön görünüşü, planı ve yan görünüşleri." },
  { slug: "firma-dokuman", title: "Firma hazırlık dökümanı", text: "Akreditasyon, kurallar, teslim tarihleri ve teknik ihtiyaçlar." },
];

export default function DocsPage() {
  const { tx } = useI18n();
  const { data: me } = useApi<{ role: string }>("/api/auth/me");
  const { data: prep, reload } = useApi<{ uploaded: boolean }>("/api/docs/firma-hazirlik");
  const [note, setNote] = useState("");
  const canUpload = me?.role === "ADMIN" || me?.role === "SAGLIK";

  return (
    <div className="space-y-4">
      <h1 className="display text-4xl">{tx("PDF dökümanlar")}</h1>
      <p className="text-[#57534e]">{tx("Program, kurallar, alan planı ve firma hazırlık paketi.")}</p>
      <div className="grid md:grid-cols-2 gap-3">
        {DOCS.map((d) => (
          <div key={d.slug} className="card p-5">
            <div className="text-xs tracking-[0.16em] uppercase text-[#0077C2]">PDF</div>
            <h2 className="display text-2xl mt-1">{tx(d.title)}</h2>
            <p className="text-sm text-[#57534e] mt-2">{tx(d.text)}</p>
            {d.slug === "firma-dokuman" && prep?.uploaded ? (
              <p className="text-xs text-[#0077C2] mt-2">{tx("Admin tarafından yüklenen dosya indirilir.")}</p>
            ) : null}
            <a className="btn mt-4" href={`/api/pdf/${d.slug}`}>{tx("İndir")}</a>
            {d.slug === "firma-dokuman" && canUpload ? (
              <label className="btn ghost mt-4 ml-2 cursor-pointer">
                {tx("PDF yükle")}
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (!file) return;
                    setNote("");
                    const body = new FormData();
                    body.append("file", file);
                    try {
                      await api("/api/docs/firma-hazirlik", { method: "POST", body });
                      setNote(tx("Hazırlık dökümanı yüklendi."));
                      await reload();
                    } catch (err) {
                      setNote(err instanceof Error ? err.message : "Yüklenemedi");
                    }
                  }}
                />
              </label>
            ) : null}
          </div>
        ))}
      </div>
      {note ? <p className="text-sm text-[#0077C2]">{note}</p> : null}
    </div>
  );
}
