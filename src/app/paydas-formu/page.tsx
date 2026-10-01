import { PortalChrome } from "@/components/gate/PortalChrome";
import { StakeholderForm } from "@/components/gate/StakeholderForm";

export const metadata = { title: "Paydaş Formu · COP31 Sağlık Pavilionu" };

export default function StakeholderFormPage() {
  return (
    <PortalChrome
      image="/gate/gate-firmalar.webp"
      kicker="Kamu ve özel sektör paydaşları · COP31"
      title="Sağlık Bakanlığı Pavilyonu Paydaş Formu"
      lead={"Stand, 15 dakikalık sunum, panel konuşmacılığı, interaktif etkinlik ve toplantı taleplerinizi bu formla iletin.\n\nAntalya EXPO · 9–20 Kasım 2026"}
    >
      <StakeholderForm />
    </PortalChrome>
  );
}
