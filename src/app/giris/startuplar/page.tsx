"use client";

import { useState } from "react";
import { PortalChrome } from "@/components/gate/PortalChrome";
import { GateLogin } from "@/components/gate/GateLogin";
import { CompanyApply } from "@/components/gate/CompanyApply";
import { useI18n } from "@/components/I18nProvider";

export default function StartupGate() {
  const [tab, setTab] = useState<"giris" | "kayit">("giris");
  const { tx } = useI18n();
  return (
    <PortalChrome
      image="/gate/gate-startup.webp"
      kicker="Startup köşesi · sağlık teknolojisi"
      title="Küçük çözüm, büyük nefes"
      lead="Teleradyoloji, atık dönüşümü, IoT solunum, gençlik demosu. İklim-sağlık prototipinizi Blue Zone’da gösterin. Kapsam otomatik Startup."
    >
      <div className="flex gap-2 mb-4">
        <button type="button" className={`tab ${tab === "giris" ? "on" : ""}`} onClick={() => setTab("giris")}>{tx("Giriş")}</button>
        <button type="button" className={`tab ${tab === "kayit" ? "on" : ""}`} onClick={() => setTab("kayit")}>{tx("Startup kaydı")}</button>
      </div>
      {tab === "giris" ? (
        <GateLogin
          heading="Startup girişi"
          accounts={[
            { role: "Yinwest Startups", email: "yinwest-startups@firma.cop31.tr" },
            { role: "Dilek Hanım", email: "dilek-hanim@firma.cop31.tr" },
          ]}
        />
      ) : (
        <CompanyApply
          defaultScope="Startup"
          lockScope
          title="Startup başvurusu"
          blurb="Demo, gençlik etkileşimi ve sıfır atık ürün. Onay sonrası Startup Köşesi masasına girersiniz."
        />
      )}
    </PortalChrome>
  );
}
