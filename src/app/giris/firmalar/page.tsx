"use client";

import Link from "next/link";
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
        <GateLogin heading="Firma girişi" />
      ) : (
        <CompanyApply
          defaultScope="Local"
          title="Firma hesabı"
          blurb="Başvuru admin onayına düşer. Onaysız hesapla giriş yapılamaz."
        />
      )}
      <div className="mt-5 border-t border-[#DCE8F0] pt-4 text-sm">
        <div className="font-semibold">{tx("Konuşmacı eklemek")}</div>
        <p className="text-[#57534e] mt-1">
          {tx("Firma hesabınızla giriş yapıp konuşmacınızı fotoğraf, kurum, özgeçmiş ve LinkedIn bilgisiyle ekleyin. Sağlık Bakanlığı onaylayınca konuşmacılar sayfasında yayınlanır.")}
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          <Link className="btn" href="/konusmaci-yonetimi">{tx("Konuşmacı ekle")}</Link>
          <Link className="btn ghost" href="/konusmacilar">{tx("Konuşmacıları gör")}</Link>
        </div>
      </div>
    </PortalChrome>
  );
}
