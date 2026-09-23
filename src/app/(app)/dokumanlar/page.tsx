import { Tx } from "@/components/I18nProvider";

const DOCS = [
  { slug: "program", title: "Pavilion programı", text: "12 günlük tematik takvim ve saatli oturum akışı." },
  { slug: "etkinlikler", title: "Etkinlikler ve paneller", text: "Panel başlıkları, paydaşlar, panelist ve moderatör listesi." },
  { slug: "alan-plani", title: "Alan planı", text: "Sahne, seminer, deneyim, stant ve lojistik bölgeler." },
  { slug: "firma-dokuman", title: "Firma hazırlık dökümanı", text: "Akreditasyon, kurallar, teslim tarihleri ve teknik ihtiyaçlar." },
];

export default function DocsPage() {
  return (
    <div className="space-y-4">
      <h1 className="display text-4xl"><Tx>PDF dökümanlar</Tx></h1>
      <p className="text-[#57534e]"><Tx>Program, etkinlik, alan planı ve firma hazırlık paketleri güncel veriden üretilir.</Tx></p>
      <div className="grid md:grid-cols-2 gap-3">
        {DOCS.map((d) => (
          <a key={d.slug} href={`/api/pdf/${d.slug}`} className="card p-5 block hover:bg-[#fff]">
            <div className="text-xs tracking-[0.16em] uppercase text-[#0077C2]">PDF</div>
            <h2 className="display text-2xl mt-1"><Tx>{d.title}</Tx></h2>
            <p className="text-sm text-[#57534e] mt-2"><Tx>{d.text}</Tx></p>
            <span className="btn mt-4"><Tx>İndir</Tx></span>
          </a>
        ))}
      </div>
    </div>
  );
}
