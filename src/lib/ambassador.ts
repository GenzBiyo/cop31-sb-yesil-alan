export const AMBASSADOR_INTRO = `🌍 COP31 Sağlık Elçileri Gönüllü Öğrenci Çağrısı

COP31 Türkiye kapsamında Sağlık Bakanlığı Pavyonu ve pavyon programında gönüllü olarak görev almak isteyen öğrencileri Sağlık Elçileri ekibine davet ediyoruz!

Gönüllü öğrenciler; pavyonu ziyaret edecek, etkinlik ve programlarda ekibe destek olacak ve COP31 deneyiminin bir parçası olacak.

📍 Başvurular Antalya ve çevresindeki üniversite ve liselerden alınmaktadır.
⚠️ Konaklama sağlanmamaktadır.

Başvurusu uygun bulunan öğrenciler, oluşturulan gönüllü ekiplere yerleştirilecek ve tüm bilgilendirmeler başvuru sırasında belirtilen iletişim adresleri üzerinden yapılacaktır.

Etkinliğe katılacakların ayrıca COP31 ziyaretçi kaydını tamamlaması gerekmektedir:
https://cop31.tr/tr/ziyaret-kaydi`;

const NEARBY_PROVINCES = ["Antalya", "Burdur", "Isparta", "Muğla", "Konya", "Karaman", "Mersin", "Denizli"];

export const TR_PROVINCES = [
  "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Aksaray", "Amasya", "Ankara", "Antalya", "Ardahan", "Artvin",
  "Aydın", "Balıkesir", "Bartın", "Batman", "Bayburt", "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur",
  "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli", "Diyarbakır", "Düzce", "Edirne", "Elazığ", "Erzincan",
  "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkari", "Hatay", "Iğdır", "Isparta", "İstanbul",
  "İzmir", "Kahramanmaraş", "Karabük", "Karaman", "Kars", "Kastamonu", "Kayseri", "Kilis", "Kırıkkale", "Kırklareli",
  "Kırşehir", "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Mardin", "Mersin", "Muğla", "Muş",
  "Nevşehir", "Niğde", "Ordu", "Osmaniye", "Rize", "Sakarya", "Samsun", "Şanlıurfa", "Siirt", "Sinop",
  "Sivas", "Şırnak", "Tekirdağ", "Tokat", "Trabzon", "Tunceli", "Uşak", "Van", "Yalova", "Yozgat", "Zonguldak",
];

const PROVINCE_OPTIONS = [...NEARBY_PROVINCES, ...TR_PROVINCES.filter((p) => !NEARBY_PROVINCES.includes(p))].join("\n");

export const DEFAULT_FIELDS = [
  { key: "fullName", label: "Ad soyad", type: "text", required: true, options: "", help: "", sortOrder: 1 },
  { key: "email", label: "E-posta", type: "email", required: true, options: "", help: "Kabul / red ve yerleştirme bilgilendirmesi bu adrese gider.", sortOrder: 2 },
  { key: "phone", label: "Telefon", type: "tel", required: true, options: "", help: "", sortOrder: 3 },
  { key: "city", label: "İl", type: "select", required: true, options: PROVINCE_OPTIONS, help: "Antalya ve çevre iller listenin başında.", sortOrder: 4 },
  {
    key: "needsSupport",
    label: "Konaklama veya ulaşım desteğine ihtiyacınız olacak mı?",
    type: "select",
    required: true,
    options: "Evet\nHayır",
    help: "Konaklama ve ulaşım desteği sağlanmamaktadır.",
    sortOrder: 5,
  },
  {
    key: "schoolType",
    label: "Okul türü",
    type: "select",
    required: true,
    options: "Üniversite\nLise",
    help: "Çevre üniversite ve liseler.",
    sortOrder: 5,
  },
  { key: "school", label: "Okul / üniversite adı", type: "text", required: true, options: "", help: "", sortOrder: 6 },
  { key: "department", label: "Bölüm / alan", type: "text", required: true, options: "", help: "Lisede alan veya sınıf yazabilirsiniz.", sortOrder: 7 },
  {
    key: "englishLevel",
    label: "İngilizce düzeyi",
    type: "select",
    required: true,
    options: "A1 — Başlangıç\nA2 — Temel\nB1 — Orta\nB2 — Orta üstü\nC1 — İleri\nC2 — Yetkin / ana dil",
    help: "",
    sortOrder: 8,
  },
  { key: "otherLanguages", label: "Diğer yabancı diller", type: "text", required: false, options: "", help: "Dil ve düzey (ör. Almanca B1, Arapça ana dil).", sortOrder: 9 },
  { key: "linkedin", label: "LinkedIn", type: "url", required: false, options: "", help: "Profil bağlantısı.", sortOrder: 10 },
  { key: "instagram", label: "Instagram", type: "text", required: false, options: "", help: "Kullanıcı adı veya profil bağlantısı.", sortOrder: 11 },
  { key: "daysCount", label: "Kaç gün sahada olabilirsiniz?", type: "number", required: true, options: "", help: "9–20 Kasım 2026 aralığında.", sortOrder: 12 },
  {
    key: "availableDates",
    label: "Hangi günler?",
    type: "multiselect",
    required: true,
    options: "9 Kasım\n10 Kasım\n11 Kasım\n12 Kasım\n13 Kasım\n14 Kasım\n15 Kasım\n16 Kasım\n17 Kasım\n18 Kasım\n19 Kasım\n20 Kasım",
    help: "Gönüllü olabileceğiniz günleri işaretleyin.",
    sortOrder: 13,
  },
  {
    key: "skills",
    label: "Destek vermek istediğiniz alanlar",
    type: "multiselect",
    required: true,
    options: "Karşılama / resepsiyon\nSaha yönlendirme\nOturum / panel desteği\nÇeviri (TR–EN)\nSosyal medya / içerik\nAlan turu rehberliği\nLojistik / koşuşturma",
    help: "",
    sortOrder: 14,
  },
  {
    key: "experience",
    label: "Daha önce görev aldığınız etkinlik ve organizasyonlar",
    type: "textarea",
    required: false,
    options: "",
    help: "Varsa yazın: etkinlik adı, yıl ve göreviniz.",
    sortOrder: 15,
  },
  { key: "motivation", label: "Kısaca kendiniz ve motivasyonunuz", type: "textarea", required: true, options: "", help: "Neden İklim Sağlık Elçisi olmak istiyorsunuz?", sortOrder: 16 },
].map((field, index) => ({ ...field, sortOrder: index + 1 }));

export const CORE_KEYS = [
  "fullName",
  "email",
  "phone",
  "school",
  "schoolType",
  "department",
  "city",
  "englishLevel",
  "otherLanguages",
  "linkedin",
  "instagram",
  "daysCount",
  "availableDates",
  "motivation",
  "skills",
] as const;

export type CoreKey = (typeof CORE_KEYS)[number];
