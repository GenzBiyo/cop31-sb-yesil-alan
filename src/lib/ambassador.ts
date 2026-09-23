export const AMBASSADOR_INTRO = `Önemli not: Konaklama sağlanmamaktadır. Bu nedenle başvurular Antalya ve çevresindeki üniversite ile liselerden alınır.

COP31 Türkiye — Sağlık Bakanlığı İklim Sağlık Elçileri, pavilonu gezer; program ve aktivitelerde gönüllü destek verir. Uygun görülen başvurular, ekibin oluşturduğu aktivitelere yerleştirilir. Kayıt kabul ve diğer bilgilendirmeler başvuru sırasında verdiğiniz iletişim adresine gönderilir.`;

export const DEFAULT_FIELDS = [
  { key: "fullName", label: "Ad soyad", type: "text", required: true, options: "", help: "", sortOrder: 1 },
  { key: "email", label: "E-posta", type: "email", required: true, options: "", help: "Kabul / red ve yerleştirme bilgilendirmesi bu adrese gider.", sortOrder: 2 },
  { key: "phone", label: "Telefon", type: "tel", required: true, options: "", help: "", sortOrder: 3 },
  { key: "city", label: "İl / ilçe (Antalya ve çevre)", type: "text", required: true, options: "", help: "Konaklama olmadığı için günlük ulaşabileceğiniz yer.", sortOrder: 4 },
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
  { key: "motivation", label: "Kısaca kendiniz ve motivasyonunuz", type: "textarea", required: true, options: "", help: "Neden İklim Sağlık Elçisi olmak istiyorsunuz?", sortOrder: 15 },
];

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
