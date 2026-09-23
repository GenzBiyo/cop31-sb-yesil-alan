"use client";

import { PortalChrome } from "@/components/gate/PortalChrome";
import { GateLogin } from "@/components/gate/GateLogin";

export default function BakanlikGate() {
  return (
    <PortalChrome
      image="/gate/gate-bakanlik.webp"
      kicker="T.C. Sağlık Bakanlığı · SGGM"
      title="Halk sağlığı masası"
      lead="İklim kaynaklı sıcaklık, hava kirliliği, salgın ve gıda riskini koruyucu sağlıkla yönetin. Pavilion hazırlığı, elçiler, paneller ve firma onayları bu kapıdan."
    >
      <GateLogin
        heading="Bakanlık girişi"
        accounts={[
          { role: "Admin", email: "admin@cop31.saglik.gov.tr" },
          { role: "Sağlık Bakanlığı", email: "sggm@cop31.saglik.gov.tr" },
        ]}
      />
    </PortalChrome>
  );
}
