import { PortalChrome } from "@/components/gate/PortalChrome";
import { AmbassadorForm } from "@/components/gate/AmbassadorForm";

export default function ElcilerGate() {
  return (
    <PortalChrome
      image="/gate/gate-elciler.webp"
      kicker="Öğrenci gönüllüleri · COP31"
      title="Sağlık ve İklim Elçisi"
      lead="Yakın üniversite ve liselerden öğrenciler. Konaklama yok. Karşılama, Solaklar outdoor, QR kayıt ve koruyucu sağlık anlatımı. Konaklama talep etmeyin — yerel ulaşım."
    >
      <AmbassadorForm />
    </PortalChrome>
  );
}
