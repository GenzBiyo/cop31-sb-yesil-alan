"use client";

import { useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import { api, useApi } from "@/lib/client";

export default function SpacePage() {
  const { tx } = useI18n();
  const { data: me } = useApi<{ role: string }>("/api/auth/me");
  const { data: plan, reload } = useApi<{ src: string }>("/api/pavilion-plan");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const canUpload = me?.role === "ADMIN" || me?.role === "SAGLIK";
  return (
    <div className="space-y-4">
      <div className="flex justify-between flex-wrap gap-3">
        <div>
          <h1 className="display text-4xl">{tx("Alan planı")}</h1>
          <p className="text-[#57534e]">
            {tx("T.C. Sağlık Bakanlığı pavilyonu. 50 m². Üstte perspektif, altta ön görünüş.")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canUpload ? (
            <label className={`btn secondary cursor-pointer ${busy ? "opacity-50" : ""}`}>
              {tx("Görseli değiştir")}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                disabled={busy}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  setBusy(true);
                  setNote("");
                  const body = new FormData();
                  body.append("file", file);
                  try {
                    await api("/api/pavilion-plan", { method: "POST", body });
                    setNote(tx("Pavilyon görseli güncellendi."));
                    await reload();
                  } catch (err) {
                    setNote(err instanceof Error ? err.message : "Yüklenemedi");
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </label>
          ) : null}
          <a className="btn" href="/api/pdf/alan-plani">{tx("Alan planı PDF")}</a>
        </div>
      </div>
      {note ? <p className="text-sm text-[#0077C2]">{note}</p> : null}
      <div className="card p-3 overflow-auto bg-white">
        <img
          src={plan?.src || "/brand/sb-pavilyon.png"}
          alt="T.C. Sağlık Bakanlığı pavilyonu, perspektif ve ön görünüş, 50 metrekare"
          className="w-full h-auto"
        />
      </div>
      <div className="card p-4 text-sm text-[#1c1917] space-y-2">
        <p>
          <strong>{tx("Eşantiyon dağıtımı")}</strong>{" "}
          {tx("resepsiyon masasından ve soldaki bilgilendirme ekranından yapılır. Yalnızca Uygun kararı alan ürünler bu noktalardan çıkar. Geçiş alanına ve pavilyon dışına ürün konmaz.")}
        </p>
        {me && me.role !== "SAGLIK" ? (
          <p>
            <a className="text-[#0077C2] underline" href="/esantiyon">{tx("Eşantiyon ve İkram")}</a>
          </p>
        ) : null}
      </div>
    </div>
  );
}
