export type OfficialPanel = {
  date: string;
  start: string;
  end: string;
  title: string;
  titleEn: string;
  theme: string;
  topics: string;
  moderator: string;
  panelists: string[];
};

export const OFFICIAL_PANELS: OfficialPanel[] = [
  {
    date: "2026-11-09",
    start: "",
    end: "",
    title: "Sağlık Sektöründe Yeşil Dönüşüm",
    titleEn: "Green Transformation in the Healthcare Sector and Green Hospitals",
    theme: "Gıda, Tarım ve Sağlık",
    topics: "Yeşil dönüşüm örnekleri; yeşil hastane ve yeşil dönüşüm yatırımları.",
    moderator: "KHGM",
    panelists: ["EBRD", "Humanis", "Başakşehir Çam ve Sakura Şehir Hastanesi", "World Medicine İlaç San. ve Tic. A.Ş."],
  },
  {
    date: "2026-11-09",
    start: "",
    end: "",
    title: "İklim Değişikliği, Halk Sağlığı ve Bulaşıcı Hastalıklar: Değişen İklimde Yeni Sağlık Tehditleri",
    titleEn: "Climate Change, Public Health and Infectious Diseases: Emerging Health Threats in a Changing Climate",
    theme: "Gıda, Tarım ve Sağlık",
    topics:
      "İklim değişikliği ve halk sağlığı; bulaşıcı hastalıkların değişen epidemiyolojisi; vektör kaynaklı hastalıklar; zoonozlar; salgınlara hazırlık; antimikrobiyal direnç; aşılar ve koruyucu sağlık; erken uyarı ve sürveyans.",
    moderator: "HSGM / DSÖ",
    panelists: ["AstraZeneca TR", "Oxoid Remel Microbiology (Thermo Fisher)", "Berko İlaç ve Kimya Sanayi A.Ş.", "Sanofi TR"],
  },
  {
    date: "2026-11-10",
    start: "",
    end: "",
    title: "Sağlık Tesislerinde Yeşil Enerji: Yenilenebilir Enerji ve Enerji Verimliliği Çözümlerinin Uygulanabilirliği",
    titleEn: "Green Energy in Healthcare Facilities: Feasibility of Renewable Energy and Energy-Efficiency Solutions",
    theme: "Enerji ve Ulaşım",
    topics:
      "Hastanelerde yenilenebilir enerji; güneş enerjisi; enerji verimliliği; enerji maliyetleri; enerji arz güvenliği; şehir hastanelerinde enerji dönüşümü.",
    moderator: "Enerji Bakanlığı",
    panelists: ["Humanis", "Başakşehir Çam ve Sakura Şehir Hastanesi", "UNEP", "AstraZeneca TR"],
  },
  {
    date: "2026-11-11",
    start: "",
    end: "",
    title: "Sıfır Atık İçin Kamu-Özel Sektör Ortaklıkları ve Yeni Döngüsel Ekonomi Modelleri",
    titleEn: "Public-Private Partnerships for Zero Waste and New Circular Economy Models",
    theme: "Sıfır Atık – Liderler Zirvesi 1. Gün",
    topics:
      "Hastanelerde sıfır atık; tıbbi atık; döngüsel ekonomi; kamu-özel sektör iş birlikleri; sürdürülebilir satın alma; atıkların ekonomik değere dönüştürülmesi.",
    moderator: "SHGM",
    panelists: [
      "Başakşehir Çam ve Sakura Şehir Hastanesi",
      "Atabay Kimya San. Tic. A.Ş.",
      "VS Medical Mühendislik ve Danışmanlık",
      "Atatürk Üniversitesi TTO İlaç Aşı ve Biyoteknoloji A.Ş.",
    ],
  },
  {
    date: "2026-11-12",
    start: "",
    end: "",
    title: "Dirençli Şehirler, Hava Kirliliği, İklim Değişikliği, Artan Sağlık Tehditleri ve Yeşil Binalar",
    titleEn: "Resilient Cities, Air Pollution and Green Buildings",
    theme: "Dirençli Şehirler ve Yapılı Çevre – Liderler Zirvesi 2. Gün",
    topics: "Hava kirliliği; iklim riskleri; halk sağlığı; dirençli şehirler; yeşil binalar; sıfır atık; iklim dirençli sağlık tesisleri.",
    moderator: "HSGM / SGGM",
    panelists: ["UNEP", "World Medicine İlaç San. ve Tic. A.Ş.", "Sanofi TR", "VS Medical Mühendislik ve Danışmanlık"],
  },
  {
    date: "2026-11-13",
    start: "",
    end: "",
    title: "Yeşil Dönüşümün Finansmanı",
    titleEn: "Climate Change, Emerging Health Threats and Financing the Green Transition",
    theme: "Finans ve Ticaret",
    topics:
      "İklim değişikliğinin sağlık etkileri; bulaşıcı hastalıklar; değişen sağlık tehditleri; uluslararası iş birlikleri; proje geliştirme; yeşil finansman.",
    moderator: "EBRD",
    panelists: ["Humanis", "Berko İlaç ve Kimya Sanayi A.Ş.", "Atabay Kimya San. Tic. A.Ş."],
  },
  {
    date: "2026-11-14",
    start: "",
    end: "",
    title: "Üniversiteler, Öğrenci Değişimi ve Yeşil Dönüşüm: Erasmus ve Sağlık Bilimleri",
    titleEn: "Universities, Student Exchange and Green Transformation: Erasmus and Health Sciences",
    theme: "Çocuk, Gençlik, Eğitim ve Beceriler",
    topics:
      "Gençlerin iklim eylemindeki rolü; Erasmus; uluslararası öğrenci hareketliliği; yeşil beceriler; geleceğin sağlık profesyonelleri; üniversitelerde sürdürülebilirlik.",
    moderator: "MEB",
    panelists: ["S&G", "AccrediTeens", "Atatürk Üniversitesi TTO İlaç Aşı ve Biyoteknoloji A.Ş."],
  },
  {
    date: "2026-11-15",
    start: "",
    end: "",
    title: "Longevity ve Sağlıklı Çevre, Sağlıklı Toplum: Antalya İçin Sağlık ve Wellness Turizmi",
    titleEn: "Longevity, Healthy Environment and Healthy Society: Antalya for Health and Wellness Tourism",
    theme: "Antalya'da Bir Nefes (sosyal-kültürel program)",
    topics: "Longevity; sağlıklı yaşlanma; sağlıklı çevre; wellness; sağlık turizmi; Antalya; sürdürülebilir yaşam; yaşam kalitesi.",
    moderator: "USHAŞ / Antalya İlçe Sağlık",
    panelists: ["Este World Well", "Gloria Hotel", "Acıbadem Sağlık Hizmetleri ve Tic. A.Ş.", "Eli Lilly TR"],
  },
  {
    date: "2026-11-16",
    start: "",
    end: "",
    title: "Yenilikten Etkiye: Yeşil Sağlık Teknolojileri, Biyoteknoloji ve Sürdürülebilir Sağlığın Geleceği",
    titleEn: "From Innovation to Impact: Green Health Technologies, Biotechnology and the Future of Sustainable Healthcare",
    theme: "Bilim, Sanayi ve Teknoloji",
    topics:
      "Biyoteknoloji; sağlık inovasyonu; yeşil teknolojiler; TÜSEB destekleri; bilimden ürüne; pilot projeler; ticarileşme; ölçeklendirme.",
    moderator: "TÜSEB",
    panelists: ["Ertunç Özcan", "May Pharma", "Good Sanitation Co (Dilek Hanım)", "Algbio"],
  },
];
