"use client";

import { useState } from "react";
import { PortalChrome } from "@/components/gate/PortalChrome";
import { GateLogin } from "@/components/gate/GateLogin";
import { CompanyApply } from "@/components/gate/CompanyApply";
import { useI18n } from "@/components/I18nProvider";

export default function FirmalarGate() {
  const [tab, setTab] = useState<"giris" | "kayit">("giris");
  const { tx } = useI18n();
  return (
    <PortalChrome
      image="/gate/gate-firmalar.webp"
      kicker="Paydaş firmalar · yeşil üretim"
      title="Karbonu kesen sağlık endüstrisi"
      lead="İlaç, cihaz ve hizmetin ayak izi hastanın da gezegenin de yüküdür. Pavilon katkınızı kaydedin; onay sonrası stant, panel ve hediyeli etkinliklerinizi yönetin."
    >
      <div className="flex gap-2 mb-4">
        <button type="button" className={`tab ${tab === "giris" ? "on" : ""}`} onClick={() => setTab("giris")}>{tx("Giriş")}</button>
        <button type="button" className={`tab ${tab === "kayit" ? "on" : ""}`} onClick={() => setTab("kayit")}>{tx("Hesap aç")}</button>
      </div>
      {tab === "giris" ? (
        <GateLogin
          heading="Firma girişi"
          accounts={[
            { role: "Atabay İlaç", email: "atabay-ilac@firma.cop31.tr" },
            { role: "Sanofi TR", email: "sanofi@firma.cop31.tr" },
          ]}
        />
      ) : (
        <CompanyApply
          defaultScope="Local"
          title="Firma hesabı"
          blurb="Başvuru admin onayına düşer. Onaysız hesapla giriş yapılamaz."
        />
      )}
    </PortalChrome>
  );
}
