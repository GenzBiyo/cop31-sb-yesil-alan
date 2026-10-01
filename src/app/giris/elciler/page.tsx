import { PortalChrome } from "@/components/gate/PortalChrome";
import { AmbassadorForm } from "@/components/gate/AmbassadorForm";

export default function ElcilerGate() {
  return (
    <PortalChrome
      image="/gate/gate-elciler.webp"
      kicker="Öğrenci gönüllüleri · COP31"
      title="Sağlık ve İklim Elçisi"
      lead={"Sağlık Bakanlığı pavilyonundaki karşılama, oyunlar, QR kayıt ve koruyucu sağlık anlatımı konusunda yardımcı olacak öğrenciler.\n\nKonaklama ve ulaşım olmadığı için Antalya ve çevre illerden başvurular önerilir."}
    >
      <AmbassadorForm />
    </PortalChrome>
  );
}
