export const CONCEPT_FIELDS = [
  { key: "titleEn", label: "İngilizce başlık", hint: "Oturumun İngilizce adı" },
  { key: "organiser", label: "Başvuran kurum", hint: "Etkinliği öneren kurum" },
  { key: "partners", label: "Paydaş kurumlar", hint: "Her satıra bir kurum" },
  { key: "organiserContact", label: "Düzenleyen ve iletişim", hint: "Kişi, unvan, e-posta" },
  { key: "themePrimary", label: "Birincil tematik alan", hint: "" },
  { key: "themeSecondary", label: "İkincil tematik alanlar", hint: "Her satıra bir alan" },
  { key: "purpose", label: "Etkinliğin amacı", hint: "Neyi göstermek ve kimleri bir araya getirmek istediğiniz" },
  { key: "keyQuestion", label: "Ele alınan soru", hint: "Ana soru ve alt başlıklar" },
  { key: "format", label: "Format ve akış", hint: "Süre, açılış, sunum, panel, soru-cevap, kapanış" },
  { key: "speakers", label: "Konuşmacılar ve rolleri", hint: "Ad, kurum ve oturumda neyi üstleneceği" },
  { key: "audience", label: "Hedef kitle", hint: "Her satıra bir kitle" },
  { key: "outcomes", label: "Beklenen sonuçlar", hint: "Oturumun bırakacağı somut çıktılar" },
  { key: "followUp", label: "COP31 sonrası işbirliği", hint: "Zirveden sonra sürecek işler" },
  { key: "contribution", label: "İklim eylemi ve halk sağlığına katkı", hint: "" },
  { key: "references", label: "Kanıt ve kaynaklar", hint: "Rapor, değerlendirme, program adları" },
] as const;

export type ConceptKey = (typeof CONCEPT_FIELDS)[number]["key"];
export type SessionConcept = Record<ConceptKey, string>;

export function emptyConcept(): SessionConcept {
  return {
    titleEn: "",
    organiser: "",
    partners: "",
    organiserContact: "",
    themePrimary: "",
    themeSecondary: "",
    purpose: "",
    keyQuestion: "",
    format: "",
    speakers: "",
    audience: "",
    outcomes: "",
    followUp: "",
    contribution: "",
    references: "",
  };
}

export function parseConcept(raw: string | null | undefined): SessionConcept {
  const concept = emptyConcept();
  if (!raw?.trim()) return concept;
  try {
    const data = JSON.parse(raw) as Partial<SessionConcept>;
    if (!data || typeof data !== "object") return concept;
    for (const field of CONCEPT_FIELDS) {
      const value = data[field.key];
      if (typeof value === "string") concept[field.key] = value;
    }
    return concept;
  } catch {
    return { ...concept, purpose: raw };
  }
}

export function conceptHasDetail(concept: SessionConcept) {
  return CONCEPT_FIELDS.some((field) => concept[field.key].trim());
}

export const HIDDEN_ASSETS_TITLE =
  "İklim Eyleminin Görünmeyen Kazanımlarını Ortaya Çıkarmak: Süper Kirleticilerin Azaltılmasının Sağlık, Tarım ve Ekonomik Faydaları";

export const HIDDEN_ASSETS_SUMMARY = `İklim değişikliği ile hava kirliliği, ortak kaynaklar ve etkiler üzerinden sağlık, tarım, ekosistemler ve ekonomiye birlikte bağlanır. Buna rağmen bu kirleticilerin azaltılmasının faydaları, politika ve yatırım kararlarında yeterince görünmez.

Bu oturum, UNEP–CCAC “Hidden Assets: The Economic and Health Case for Climate and Clean Air Action” değerlendirmesinin ana mesajlarını sunar. Bu mesajların Türkiye ve pratik, sektörler arası iklim çözümü arayan diğer ülkeler için ne anlama geldiğini açar.

Tartışma, süper kirletici eyleminin sağlık ve tarım boyutuna odaklanır. Tarımdan gelen metan ve diğer kirleticiler iklim değişikliğine ve hava kirliliğine katkı verirken gıda sistemlerini ve geçim kaynaklarını da etkiler. Emisyonların azaltılması ise halk sağlığı, verimlilik, gıda güvenliği ve ekonomik dayanıklılık için eşzamanlı fayda üretebilir.

Sağlık Bakanlığı ve Tarım ve Orman Bakanlığından üst düzey temsilciler, UNEP/CCAC ve özel sektör, bu ortak faydaların ulusal politikaya, sağlığın geliştirilmesine, tarım stratejilerine ve yatırım kararlarına nasıl işleneceğini konuşur.

Oturum, iklim değişikliğinin etkilerini anlatmanın ötesine geçerek uygulama için somut fırsatları işaret eder. Bakanlıklar, uluslararası kuruluşlar, akademi ve iş dünyası arasında daha güçlü işbirliğini ve kanıt, teknoloji, finans ile ortaklıkların eylemi nerede destekleyebileceğini öne çıkarır.`;

export const HIDDEN_ASSETS_CONCEPT: SessionConcept = {
  titleEn:
    "Unlocking the Hidden Assets of Climate Action: Health, Agriculture and Economic Benefits of Cutting Super Pollutants",
  organiser: "Astorg (Thermo Fisher)",
  partners: `Birleşmiş Milletler Çevre Programı (UNEP) İklim ve Temiz Hava Koalisyonu (CCAC)
T.C. Sağlık Bakanlığı
T.C. Tarım ve Orman Bakanlığı
Özel sektör paydaşları`,
  organiserContact: "",
  themePrimary: "İklim değişikliği ve sağlığın geliştirilmesi",
  themeSecondary: `Hava kirliliği ve sağlık
Sağlıklı ve iklime dirençli şehirler
İklim değişikliği ve sağlık okuryazarlığı
Gıda, tarım ve sağlık
Sağlık ve iklimin ortak faydaları
Çok sektörlü iklim eylemi ve uygulama

Oturum özellikle 9 Kasım Gıda, Tarım ve Sağlık tematik günüyle ve COP31’in Dinamik ve Dirençli Sağlık Sistemleri gündemiyle örtüşür.`,
  purpose: `Oturum, süper kirleticiler üzerinde atılacak adımların iklim azaltımının çok ötesine geçen faydalar üretebileceğini gösterir. Bu kirleticiler metan, siyah karbon, troposferik ozon öncülleri, azot oksit ve hidroflorokarbonları kapsar.

UNEP–CCAC’nin yeni değerlendirmesi Hidden Assets: The Economic and Health Case for Climate and Clean Air Action esas alınır. Bütünleşik iklim ve temiz hava eyleminin halk sağlığını nasıl iyileştirebileceği, gıda ve tarım sistemlerini nasıl güçlendirebileceği, ekonomik kayıpları nasıl azaltabileceği ve dirençli kalkınmayı nasıl destekleyebileceği konuşulur.

Sağlık, tarım, iklim, uluslararası kuruluşlar ve özel sektör aynı masada buluşur. Amaç kanıttan uygulamaya geçmektir; odak Türkiye için geçerli fırsatlardadır.`,
  keyQuestion: `Türkiye ve diğer ülkeler, süper kirleticilerin azaltılmasının ekonomik ve sağlık faydalarını somut politikalara, yatırımlara ve sektörler arası eyleme nasıl çevirebilir?

Tartışma şunları açar:
Halk sağlığı açısından iklim ve temiz hava eyleminin “görünmeyen kazanımları” nelerdir?
Metan ve diğer tarımsal emisyonların azaltılması iklim hedeflerine, gıda güvenliğine, tarımsal verime ve insan sağlığına aynı anda nasıl katkı verir?
Sağlık bakanlıkları iklim ve hava kalitesi faydalarını koruma, sağlığın geliştirilmesi ve dayanıklılık stratejilerine nasıl daha iyi işler?
Sağlık, tarım, çevre ve özel sektör arasında daha güçlü işbirliği için hangi fırsatlar vardır?
Ekonomik kanıt, Türkiye’de ve uluslararası alanda yatırım yapılabilir ve uygulanabilir projelere nasıl çevrilir?`,
  format: `Yüksek düzey panel tartışması / politika diyaloğu
Önerilen süre: 60–75 dakika

Açılış — 5 dakika
T.C. Sağlık Bakanlığı / Sağlığın Geliştirilmesi Genel Müdürlüğü karşılama konuşması
Sağlık–iklim bağının çerçevesi

Sunum — 10 dakika
UNEP–CCAC Hidden Assets ekonomik değerlendirmesinin temel bulguları
Sağlık, tarım ve ekonomik ortak faydalara odak

Yüksek düzey panel — 35–40 dakika
T.C. Sağlık Bakanlığı
T.C. Tarım ve Orman Bakanlığı
UNEP/CCAC
Özel sektör temsilcisi
Olası akademik / teknik uzman

Etkileşimli tartışma — 10–15 dakika
Katılımcı soruları
Uygulama ve işbirliği için öncelik alanlarının belirlenmesi

Kapanış — 5 dakika
Ana mesajların özeti
İzlenebilecek işbirliği başlıkları`,
  speakers: `Sağlığın Geliştirilmesi Genel Müdürü — T.C. Sağlık Bakanlığı
Sağlığın Geliştirilmesi Genel Müdür Yardımcısı — T.C. Sağlık Bakanlığı
T.C. Tarım ve Orman Bakanlığı temsilcisi — ilgili dairenin üst düzey temsilcisi, teyide bağlı
UNEP İklim ve Temiz Hava Koalisyonu temsilcisi — Hidden Assets değerlendirmesi ve bütünleşik iklim ile temiz hava eyleminin sonuçları
Direktör, Astorg / Thermo Fisher Scientific — iklim, sağlık, teknoloji ve inovasyonda özel sektör perspektifi

Teyide bağlı:
Dünya Sağlık Örgütü temsilcisi
CCAC ortak kuruluşu / teknik uzman
İklim, hava kirliliği, sağlık veya tarım sistemleri üzerine çalışan Türk akademisyen
İlgili Türk özel sektör veya teknoloji ortağı`,
  audience: `Türk kamu temsilcileri, özellikle sağlık, tarım, çevre, enerji ve yerel yönetim
Uluslararası kuruluşlar ve kalkınma ortakları
Sağlık çalışanları ve halk sağlığı uzmanları
Tarım ve gıda sistemi paydaşları
İklim ve temiz hava uzmanları
Akademi ve araştırma kurumları
Özel sektör ve teknoloji şirketleri
Sivil toplum kuruluşları
Gençlik ve iklim-sağlık savunucuları
COP31 katılımcıları ve Yeşil Alan ziyaretçileri`,
  outcomes: `Bütünleşik iklim ve temiz hava eyleminin ekonomik, sağlık ve tarımsal ortak faydalarına ilişkin farkındalığı artırmak.
UNEP–CCAC Hidden Assets değerlendirmesini Türk ve uluslararası sağlık ile tarım paydaşlarına tanıtmak.
Süper kirleticiler konusunda Türkiye’nin sağlık, tarım ve iklim kurumları arasındaki diyaloğu güçlendirmek.
İklim ve temiz hava ortak faydalarının sağlığın geliştirilmesi ve koruma stratejilerine işlenmesi için pratik fırsatları belirlemek.
Tarımsal metan ve diğer süper kirleticilerin azaltılmasının iklim, sağlık ve gıda güvenliği hedeflerine aynı anda nasıl katkı vereceğini göstermek.
Kamu, uluslararası kuruluşlar, akademi ve özel sektör arasındaki bağları güçlendirmek.
COP31 sonrasında teknik işbirliği ve proje geliştirme için izlenecek başlıklar üretmek.`,
  followUp: `Türkiye odaklı, iklim, temiz hava, sağlık ve tarımı bir araya getiren sektörler arası bir diyalog.
Hidden Assets bulgularının Türkiye’nin ulusal ve sektörel önceliklerine uygulanması.
Aynı anda sağlık ve ekonomik fayda üreten öncelikli süper kirletici azaltım fırsatlarının belirlenmesi.
Sağlık Bakanlığı, Tarım ve Orman Bakanlığı, Çevre, Şehircilik ve İklim Değişikliği Bakanlığı, CCAC ve ilgili uluslararası ortaklar arasında teknik değişim.
Metan ve diğer süper kirleticilerin azaltımını sağlık, tarımsal verim ve dayanıklılıkla birleştiren kanıta dayalı proje kavramları.
Ölçeklenebilir çözümler için özel sektör ve teknoloji ortaklarıyla çalışma.
CCAC ve UNEP platformları üzerinden kanıt, veri ve iyi uygulama değişiminin sürdürülmesi.`,
  contribution: `Süper kirleticilerin azaltılması, iklim eylemini hemen hissedilen halk sağlığı faydalarına bağlar.

İklim eylemi açısından oturum, metan ve diğer kısa ömürlü iklim kirleticilerinin emisyonunu düşürecek pratik fırsatları ve uygulamanın hızlanması için ekonomik gerekçeyi görünür kılar.

Halk sağlığı açısından bütünleşik iklim ve temiz hava eylemi, zararlı hava kirliliğine maruziyeti ve buna bağlı sağlık risklerini azaltırken iklime bağlı etkilere karşı dayanıklılığı güçlendirir. Koruma odaklı sağlığın geliştirilmesi, azaltım ve uyum çabalarını tamamlar.

Tarım boyutu, iklim ve temiz hava eyleminin emisyonu düşürürken gıda güvenliğine, tarımsal dayanıklılığa ve geçim kaynaklarına nasıl katkı verebileceğini gösterir.

Oturum bu nedenle “Sağlık Her Politikada” yaklaşımını destekler: sağlık sonuçlarını iklim, tarım, çevre ve ekonomi politikasıyla aynı çerçevede okur.`,
  references: `Birincil kanıt
UNEP ve Climate and Clean Air Coalition (2026), Hidden Assets: The Economic and Health Case for Climate and Clean Air Action.
Değerlendirme, iklim ve temiz hava eyleminin ekonomik ve sağlık faydalarını bütünleşik olarak inceler ve sektörler arasında bir çözüm portföyüne bakar.

İlgili CCAC kanıtı ve girişimleri
CCAC Super Pollutant Investment Analysis
CCAC Technology and Economic Assessment Panel (TEAP)
CCAC Agriculture Super Pollutant Flagship / Farmers’ Initiative for Resilient and Sustainable Transformations (FIRST)
CCAC’nin metan, hava kirliliği, tarım ve sağlık çalışmaları
CCAC Super Pollutant Prioritisation Strategy 2026–2030

Oturum bu kaynakları küresel kanıt ile Türkiye’ye özgü öncelikleri ve uygulama fırsatlarını buluşturmak için kullanır.`,
};
