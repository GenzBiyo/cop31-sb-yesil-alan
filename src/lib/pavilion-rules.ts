import { prisma } from "./prisma";

export const PAVILION_RULES_KEY = "pavilionRules";

export const COMPLIANCE_TYPES = ["etkinlik", "ikram", "esantiyon"] as const;

export const DEFAULT_PAVILION_RULES = `# COP31 T.C. Sağlık Bakanlığı Pavilyonu
## Paydaş Katılım, Etkinlik, Stand ve Marka Kullanım Kuralları

Bu metin, T.C. Sağlık Bakanlığı Pavilyonu için kurum içi uygulama kuralıdır. COP31 organizasyonunun kesin catering, güvenlik veya logo şartları ayrıca yayınlanırsa onlar üstün kural olarak uygulanır ve bu metin buna göre güncellenir.

# 1. Amaç ve kapsam

Bu kurallar; COP31 kapsamında T.C. Sağlık Bakanlığı Pavilyonu / Yeşil Alan içinde yer alacak kamu kurumları, özel sektör kuruluşları, üniversiteler, sivil toplum kuruluşları, uluslararası kuruluşlar ve diğer paydaşların etkinlik ve sunumlarını, panel ve oturumlarını, stantlarını, dijital ekran ve görsel içeriklerini, basılı materyallerini, eşantiyon ve tanıtım materyallerini, yiyecek-içecek ikramlarını, kurumsal marka ve logo kullanımlarını düzenler.

Temel ilke: Pavilyon içindeki tüm faaliyetler “Sağlıklı İnsan, Sağlıklı Gezegen” temasıyla uyumlu, bilimsel kanıta dayalı, çözüm ve uygulama odaklı, erişilebilir, sürdürülebilir ve kurumsal bütünlüğü koruyacak şekilde yürütülür.

Pavilyon bir ticari fuar veya satış alanı değildir. Paydaşlar ürün, teknoloji, proje ve iyi uygulamalarını görünür kılabilir. Tüm iletişim kamu yararı, bilimsel bilgi, iklim-sağlık ilişkisi ve sürdürülebilirlik amacıyla uyumlu olmalıdır. Uygunluk onayı almayan hiçbir etkinlik, ikram veya eşantiyon pavilyonda dağıtılamaz, ikram edilemez veya sergilenemez.

# 2. Etkinlik ve sunum

Klasik anlatım yerine katılımcı, etkileşimli ve çözüm odaklı formatlar tercih edilir.

## 2.1. İçerik

- İklim değişikliği ile sağlık ilişkisine bağlı olmalıdır.
- Pavilyonun genel temasıyla uyumlu olmalıdır.
- Mümkün olduğunca sorun, çözüm, uygulama ve ölçülebilir sonuç sırasıyla hazırlanmalıdır.
- Bilimsel veriler, güvenilir kaynaklar ve doğrulanabilir bilgiler kullanılmalıdır.
- Ürün veya hizmet tanıtımı, içeriği yalnızca ticari tanıtmaya dönüştürmemelidir.
- Reklam niteliğinde abartılı, yanıltıcı veya kanıtlanmamış sağlık iddiaları kullanılamaz.

## 2.2. Etkinlikten önce istenecekler

- Sunum başlığı (TR/EN)
- Kurum adı
- Konuşmacı adı ve unvanı
- Sunum özeti
- Sunum dosyası
- Kullanılacak video ve görseller
- Kaynakça
- Kullanılacak logo ve marka listesi
- Varsa ürün veya hizmet tanıtım içeriği

Tüm içerikler etkinlikten önce Pavilyon koordinasyon ekibinin onayına sunulur.

# 3. Panel

Panel yapısında kamu, uluslararası kuruluş, akademi, yerel yönetim veya sivil toplum ile gençlik ve toplum temsilinin birlikte yer alması teşvik edilir.

## 3.1. Yapı

- Farklı sektörlerden konuşmacılara yer verilir.
- Farklı uzmanlık alanları bulunur.
- Kadın ve genç temsilciler gözetilir.
- Ulusal ve uluslararası perspektifler birlikte düşünülür.

## 3.2. Süre

Pavilyon paneli 60 dakikadır:

- 5 dakika açılış
- 40 dakika panel tartışması
- 10 dakika soru-cevap
- 5 dakika kapanış

## 3.3. Moderatör

- Konuşmacılara eşit süre tanır.
- Ticari tanıtımın panelin önüne geçmesine izin vermez.
- Tartışmayı konu başlığında tutar.
- Çıktıyı çözüm ve uygulamaya yönlendirir.

## 3.4. Ticari tanıtım

Panelde ürün fiyatı, satış kampanyası, indirim, satın alma çağrısı veya doğrudan satış yönlendirmesi yapılamaz. Firmanın iklim-sağlık alanındaki teknolojisi, uygulaması, Ar-Ge çalışması, ölçülebilir etkisi ve iyi uygulaması anlatılabilir.

# 4. Stand

Stant; sağlık ve iklim konulu ürün tanıtımı, halka yönelik bilgilendirme ve iyi uygulamaların anlatılması içindir.

## 4.1. Tasarım

- Pavilyonun genel mimari ve görsel bütünlüğüne uyulur.
- Stand alanı dışına taşan masa, pano, ürün veya broşürlük kullanılamaz.
- Ortak geçiş alanları işgal edilemez.
- Yüksek sesli müzik veya sürekli sesli yayın yapılamaz.
- Yanıp sönen veya rahatsız edici ışık efektleri kullanılamaz.
- Gereksiz plastik, tek kullanımlık dekorasyon ve yüksek atık oluşturan malzemelerden kaçınılır.

## 4.2. Ürün sergileme

- Ürünler yalnızca onaylanan stand alanında sergilenir.
- Geçiş alanlarında teşhir edilemez.
- Sağlıkla ilgili iddialar ilgili mevzuata uygun olmalıdır.
- Ürün dağıtımı veya satışı ayrıca Pavilyon koordinasyonunun onayına bağlıdır.

## 4.3. Personel

- Akreditasyon ve güvenlik kurallarına uyulur.
- Yaka kartı görünür taşınır.
- Ziyaretçiler zorlayıcı biçimde standa çekilemez.
- Diğer paydaşların alanlarına müdahale edilemez.
- Kurumsal ve profesyonel kıyafet standardına uyulur.

# 5. Ekran ve video

## 5.1. Gösterilebilecek içerik

- Kurumsal tanıtım filmi
- Proje veya uygulama videosu
- İnfografik
- Bilimsel veri
- Sürdürülebilirlik çalışması
- İklim-sağlık bağlantılı ürün veya hizmet tanıtımı

## 5.2. Video standardı

- Sessiz veya düşük ses seviyesinde oynatılır.
- Altyazılı hazırlanır.
- Türkçe ve/veya İngilizcedir.
- Mümkünse otomatik döngüdedir.
- Süre 60–90 saniyeyi geçmez.
- Aşırı hızlı geçiş ve yanıp sönen görüntü kullanılmaz.
- Sesli yayın için Pavilyon koordinatörünün önceden onayı şarttır.

## 5.3. Yasak içerik

- Siyasi propaganda
- Rakip firma karşılaştırması
- Başka kurum veya firmayı küçük düşüren içerik
- Doğrulanmamış sağlık iddiası
- Yanıltıcı “%100”, “kesin tedavi”, “en iyi” gibi ifadeler
- Aşırı ticari reklam
- İzin alınmamış COP31, UNFCCC veya UN logoları

# 6. Eşantiyon

## Teşvik edilenler

- Dijital bilgi kartı ve QR kodlu içerik
- Geri dönüştürülebilir ve yeniden kullanılabilir ürün
- Sürdürülebilir malzeme
- Küçük eğitim ve bilgilendirme materyali
- Uygun tohum veya bitki materyali
- Bez veya geri dönüştürülmüş materyalden çanta

## Dağıtılamaz veya sınırlıdır

- Tek kullanımlık plastik ürün ve plastik poşet
- Gereksiz miktarda broşür
- Yüksek adetli klasik promosyon (kalem, anahtarlık ve benzeri)
- Ambalajı yüksek ürün
- Kişisel bakım veya kozmetik numunesi
- Sağlık ürünü veya ilaç numunesi

Her eşantiyon, adet ve tanımla sisteme girilir. Yalnızca “Uygun” kararı alanlar dağıtılabilir.

# 7. Su, kahve ve ikram

Bu bölüm, COP31 organizasyonunun kesin catering şartı yayınlanana kadar Pavilyonun kurum içi kuralıdır. Organizasyon şartı açıklandığında o şart üstün tutulur.

## Su

Tek kullanımlık plastik şişe kullanılmaz. Yeniden doldurulabilir su istasyonu, sebil, cam veya metal servis ekipmanı ve gerektiğinde geri dönüştürülebilir veya kompostlanabilir bardak kullanılır.

## Kahve ve ikram

- Pavilyon koordinasyonundan önceden izin alınır.
- Tek kullanımlık plastik bardak kullanılmaz.
- Kompostlanabilir veya geri dönüştürülebilir bardak tercih edilir.
- Gereksiz tek kullanımlık karıştırıcı kullanılmaz.
- Şeker ve krema gereksiz bireysel ambalajlarla sunulmaz.
- İkram alanı stand sınırları içinde tutulur.
- Atıklar ayrıştırılır.

Her ikram kalemi, adet ve tanımla sisteme girilir. Yalnızca “Uygun” kararı alanlar ikram edilebilir.

# 8. Marka ve görsel kimlik

## 8.1. T.C. Sağlık Bakanlığı markası

Firma, Bakanlık logosunu kendi kurumsal logosu gibi kullanamaz. Logo yalnızca onaylanan ortak iletişim materyallerinde ve Bakanlığın kurumsal kimlik kurallarına uygun kullanılır.

## 8.2. COP31 logosu ve unvan

“COP31 Partneri”, “COP31 Resmî Destekçisi”, “COP31 Sağlık Bakanlığı Pavilyonu” ve benzeri ifadeler kendiliğinden kullanılamaz. COP31 logosunun kullanımı, Türkiye Cumhuriyeti Hükümeti / COP31 Başkanlığı'nın önceden yazılı iznine bağlıdır.

## 8.3. UN ve UNFCCC logosu

UN, UNFCCC ve COP logoları yazılı yetki olmadan kullanılamaz.

## 8.4. Firma logosu

- Yalnızca tahsis edilen alanda kullanılır.
- Onaylanan tasarımın dışına çıkılmaz.
- Belirlenen azami ölçüler aşılmaz.
- Firma logosu, Sağlık Bakanlığı veya COP31 logosundan daha baskın görünemez.

# 9. Onay

Firma içeriği hazırlar. Bakanlık uygunluk verir. Teknik kontrol, sahada uygulanabilirliği doğrular. Onayı olmayan kayıt dağıtılamaz.

| İçerik | Firma hazırlar | Bakanlık onayı | Teknik kontrol |
| --- | --- | --- | --- |
| Panel sunumu | Evet | Evet | Evet |
| Panel konuşmacıları | Evet | Evet | — |
| Stand tasarımı | Evet | Evet | Evet |
| Stand arkası video | Evet | Evet | Evet |
| Firma logosu | Evet | Evet | Evet |
| Sağlık Bakanlığı logosu | — | Evet | Evet |
| COP31 logosu | — | Evet | Evet |
| Eşantiyon | Evet | Evet | Evet |
| Kahve ve su ikramı | Evet | Evet | Evet |
| Basılı materyal | Evet | Evet | Evet |
| Fotoğraf ve video çekimi | Evet | Evet | Evet |

Uygunluk bu sistem üzerinden verilir. “Uygun” dışındaki hiçbir etkinlik materyali, ikram veya eşantiyon pavilyonda kullanılamaz.
`;

export async function readPavilionRules() {
  const row = await prisma.setting.findUnique({ where: { key: PAVILION_RULES_KEY } });
  const value = row?.value?.trim();
  return value || DEFAULT_PAVILION_RULES;
}

export async function savePavilionRules(body: string) {
  const value = body.trim();
  if (value.length < 40) throw new Error("Kural metni çok kısa");
  await prisma.setting.upsert({
    where: { key: PAVILION_RULES_KEY },
    update: { value },
    create: { key: PAVILION_RULES_KEY, value },
  });
  return value;
}
