import { PortalChrome } from "@/components/gate/PortalChrome";
import { AmbassadorForm } from "@/components/gate/AmbassadorForm";

export default function ElcilerGate() {
  return (
    <PortalChrome
      image="/gate/gate-elciler.webp"
      kicker="Öğrenci gönüllüleri · COP31"
      title="Sağlık ve İklim Elçisi"
      lead="Antalya ve çevresindeki üniversite ve liselerden gönüllü öğrenciler. Pavyon ve programda destek. Konaklama sağlanmaz."
    >
      <AmbassadorForm />
    </PortalChrome>
  );
}
