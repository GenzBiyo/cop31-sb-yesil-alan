# -*- coding: utf-8 -*-
"""Rebuild pavilion-program.ts from the 20 Oct 2026 glance calendar."""
import json
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "src" / "lib" / "pavilion-program.ts"

THEMES = {
    "2026-11-09": {"tr": "Gıda, tarım ve sağlık", "en": "Food, Agriculture and Health"},
    "2026-11-10": {"tr": "Enerji ve ulaştırma", "en": "Energy and Transport"},
    "2026-11-11": {"tr": "Sıfır Atık", "en": "Zero Waste"},
    "2026-11-12": {"tr": "Dayanıklı şehirler ve yapılı çevre", "en": "Resilient Cities and Built Environment"},
    "2026-11-13": {"tr": "Finans ve ticaret", "en": "Finance and Trade"},
    "2026-11-14": {"tr": "Çocuklar, gençlik, eğitim ve beceriler", "en": "Children, Youth, Education and Skills"},
    "2026-11-15": {"tr": "Antalya'da bir nefes", "en": "A Breath in Antalya"},
    "2026-11-16": {"tr": "Bilim, sanayi ve teknoloji", "en": "Science, Industry and Technology"},
    "2026-11-17": {"tr": "Okyanus, denizler, doğa ve arazi kullanımı — Rio Sinerjisi", "en": "Ocean, Nature and Land Use — Rio Synergies"},
    "2026-11-18": {"tr": "İnsani ve sosyal kalkınma", "en": "Humanitarian and Social Development"},
    "2026-11-19": {"tr": "İmece: uygulamanın güçlendirilmesi", "en": "İmece: Strengthening Implementation"},
    "2026-11-20": {"tr": "Nihai müzakereler", "en": "Final Negotiations"},
}

# code, date, start, end, title, titleEn, kind, host, moderator, speakers, topics, status, note
RAW = [
    ("09-S1", "2026-11-09", "12:00", "13:00",
     "İklime Hazır Üniversite: Eğitim, Geleceğin Sağlık İş Gücünü Nasıl Hazırlayabilir?",
     "The Climate-Ready University: How Education Can Build the Health Workforce of Tomorrow",
     "İyi uygulama (başvuru)", "Yuvam Dünya İklim Değişikliği ile Mücadele Derneği",
     "Yuvam Dünya İklim Değişikliği ile Mücadele Derneği",
     ["Prof. Dr. Levent Kurnaz", "Prof. Dr. Hasan Bayram", "Kıvılcım Pınar Eğilmez Kocabıyık"],
     "İklim değişikliği ve sağlık; sağlık eğitimi; gençlik; iklim uyumu; sağlık iş gücünün iklim dirençliliği",
     "Planlandı", "Oturum saati 12:00–13:00"),
    ("09-MA", "2026-11-09", "12:00", "13:00",
     "Beyond Digitalization: Connecting Climate Data, Health Intelligence and Health-System Capacity",
     "Beyond Digitalization: Connecting Climate Data, Health Intelligence and Health-System Capacity",
     "Uluslararası (DSÖ)", "Dünya Sağlık Örgütü (DSÖ)", "SGGM",
     ["SBSGM", "MGM", "DSÖ", "TÜSEB"], "", "Planlandı", "DSÖ Mavi Alan oturumu"),
    ("09-S3", "2026-11-09", "14:00", "15:00",
     "İklim Değişikliği, Halk Sağlığı: Değişen İklimde Yeni Sağlık Tehditleri",
     "Climate Change, Public Health: Emerging Health Threats in a Changing Climate",
     "Paydaş paneli (kurumsal)", "Halk Sağlığı Genel Müdürlüğü (HSGM)",
     "Halk Sağlığı Genel Müdürlüğü (HSGM)",
     ["UNEP temsilcisi", "Münevver Gönenç", "Marc Gates"], "", "Planlandı", ""),
    ("09-S4", "2026-11-09", "16:30", "17:30",
     "Sağlıklı ve Dirençli Kentler İçin Yerel İklim Konferansları",
     "Local Climate Conferences for Healthy and Resilient Cities",
     "İyi uygulama (başvuru)", "ICLEI",
     "Gökşen Şahin",
     ["Dr. Cemil Tugay", "Alper Taban"], "", "Planlandı", "Oturum saati 16:30 sonrası. Konuşmacı 2 boş."),
    ("10-S2", "2026-11-09", "18:00", "18:30",
     "İklim Değişirken Sağlığı Korumak: Türkiye’nin Halk Sağlığı Hamlesi",
     "Protecting Health in a Changing Climate: Türkiye’s Public Health Drive",
     "Bakanlık oturumu", "Halk Sağlığı Genel Müdürlüğü (HSGM)", "",
     [], "İklim ve Sağlık IPA III Projesi ile güçlenen eylem", "İçerik bekleniyor", "İçerik bekleniyor"),
    ("12-S1", "2026-11-10", "10:00", "11:00",
     "Sağlık Sektöründe Yeşil Dönüşüm",
     "Green Transformation in the Healthcare Sector and Green Hospitals",
     "Paydaş paneli (kurumsal)", "Kamu Hastaneleri Genel Müdürlüğü (KHGM)",
     "Prof. Dr. Bahar Aydınlı",
     ["Mehmet Onur", "Nalan Abdullahoğlu", "Aysun Hatipoğlu", "Prof. Dr. Özgür Yiğit"],
     "", "Planlandı", ""),
    ("09-S2", "2026-11-10", "12:00", "13:00",
     "KOAH ve Solunum Sağlığı: İklim Değişikliği Karşısında Daha Dirençli Toplumlar",
     "COPD and Respiratory Health: Building More Resilient Communities in a Changing Climate",
     "Paydaş paneli (kurumsal)", "Sağlık Bakanlığı · Sanofi Türkiye",
     "Umut Ağyüz",
     ["Doç. Dr. Mikail Özdemir", "Prof. Dr. Mine Durusu Tanrıöver", "Aysun Hatipoğlu"],
     "", "Planlandı", "Oturum saati 12:00–13:00"),
    ("10-S1", "2026-11-10", "14:00", "15:00",
     "Doğum Hizmetlerinde Çevresel Sürdürülebilirlik: Ölçümden Uygulamaya",
     "Environmental Sustainability in Maternity Care: From Measurement to Practice",
     "İyi uygulama (başvuru)", "Kamu Hastaneleri Genel Müdürlüğü (KHGM)",
     "Doç. Dr. Asibe Özkan",
     ["Uzm. Ecz. Burcu Özarslan", "Doç. Dr. Füsun Afşar", "Doç. Dr. Çağanay Soysal"],
     "Yeşil doğumhane; çevresel sürdürülebilirlik", "Planlandı", ""),
    ("10-S3", "2026-11-10", "16:00", "17:00",
     "Sağlık Tesislerinde Yeşil Enerji: Yenilenebilir Enerji ve Enerji Verimliliği Çözümlerinin Uygulanabilirliği",
     "Green Energy in Healthcare Facilities: Feasibility of Renewable Energy and Energy-Efficiency Solutions",
     "İyi uygulama (Endüstri)", "SYGM", "SYGM",
     ["Haluk Sancak", "Sohrab Mammadli", "Prof. Dr. Ahmet Hacımüftüoğlu", "Bahadır Özdemir"],
     "", "Planlandı", ""),
    ("10-EN", "2026-11-10", "18:00", "18:30",
     "Sağlık Bakanlığı Enerji Verimliliği Uygulamaları",
     "Ministry of Health Energy-Efficiency Practice",
     "Bakanlık oturumu", "SGGM", "SGGM",
     ["Kadir Yavuz", "Muhittin Demirkasımoğlu"], "", "Planlandı", ""),
    ("13-S2", "2026-11-13", "10:00", "11:00",
     "İklim Değişikliği, Göç ve Bulaşıcı Hastalık Riskleri: Bölgesel Kanıttan Sağlık Sistemi Eylemine",
     "Climate Change, Migration and Infectious-Disease Risk: From Regional Evidence to Health-System Action",
     "Uluslararası (DSÖ)", "Dünya Sağlık Örgütü (DSÖ)", "Dünya Sağlık Örgütü (DSÖ)",
     ["Doç. Dr. Hülya Şirin", "Dr. Gonzalo Castro de la Mata", "Doç. Dr. Tufan Nayır"],
     "", "Planlandı", ""),
    ("13-SP", "2026-11-13", "14:00", "15:00",
     "Bitiş Çizgisinin Ötesinde: Daha Sıcak Bir Dünyada İnsan Sağlığını Korumak İçin Spordan Öğrenebileceklerimiz",
     "Beyond the Finish Line: What Sport Can Teach Us About Protecting Human Health in a Hotter World",
     "İyi uygulama (başvuru)", "", "Elif Özdemir Şankaya",
     ["Mete Gazoz", "Yusuf Göktuğ Ergin", "Dr. Burçin İkiz"], "", "Planlandı", ""),
    ("13-S3", "2026-11-13", "16:00", "17:00",
     "Sağlık Sektöründe Yeşil Finans",
     "Green Finance in the Health Sector",
     "Paydaş paneli (kurumsal)", "Kamu Hastaneleri Genel Müdürlüğü (KHGM)",
     "Muhammet Nur Öğün",
     ["Haluk Sancak", "Barış Özyurtlu", "Sohrab Mammadli", "EBRD"],
     "", "Planlandı", ""),
    ("14-S1", "2026-11-14", "10:00", "11:00",
     "Gençlik ve Üniversiteler için İklim Değişikliği: Cerrahpaşa ve Demiroğlu Bilim Üniversitesi Oturumu",
     "Climate Change for Youth and Universities: Cerrahpaşa and Demiroğlu Bilim University Session",
     "İyi uygulama (başvuru)", "İÜ-Cerrahpaşa · Demiroğlu Bilim Üniversitesi",
     "Dr. Merve Tecirli",
     ["İÜ-Cerrahpaşa", "İÜ-Cerrahpaşa (2)", "Dr. Öğr. Üyesi Reyhan Kaygusuz Benli"],
     "Gençlik; iklime hazır üniversite", "Teyit bekliyor", "Cerrahpaşa konuşmacı isimleri bekleniyor"),
    ("14-S3", "2026-11-14", "14:00", "15:00",
     "Üniversiteler, Öğrenci Değişimi ve Yeşil Dönüşüm: Erasmus ve Sağlık Bilimleri",
     "Universities, Student Exchange and Green Transformation: Erasmus and Health Sciences",
     "Paydaş paneli (kurumsal)", "SGGM", "Dr. Aslınur Demir",
     ["Matina Sotiraki", "Hamza Yüksel", "Prof. Dr. Ahmet Hacımüftüoğlu"],
     "", "Planlandı", ""),
    ("14-LC", "2026-11-14", "16:00", "17:00",
     "Kanıttan Eyleme: Lancet Countdown 2026 Türkiye İklim ve Sağlık Politika Öncelikleri",
     "From Evidence to Action: Lancet Countdown 2026 Türkiye Climate and Health Policy Priorities",
     "Bakanlık oturumu", "SGGM", "Uzm. Dr. Ayşegül Esin",
     ["Lancet Countdown temsilcisi", "Doç. Dr. Melike Yavuz", "Sağlık Bakanlığı temsilcisi"],
     "", "Teyit bekliyor", ""),
    ("18-S1", "2026-11-15", "14:00", "15:00",
     "Tarladan Zirveye: Kadın Kooperatifleriyle İklim-Sağlık Dirençliliği ve Deneyim Aktarımı",
     "From Field to Summit: Climate-Health Resilience and Knowledge Sharing with Women's Cooperatives",
     "İyi uygulama (başvuru)", "Bolu Abant İzzet Baysal Üniversitesi", "HSGM",
     ["Doç. Dr. Gamze Doğdu Yücetürk", "Prof. Dr. Emine Didem Evci Kiraz", "Emine Dönmez Özdoğan"],
     "Kadın, iklim ve sağlık; kırsal dayanıklılık; kooperatifler", "Planlandı", ""),
    ("16-S3", "2026-11-15", "16:00", "17:00",
     "Yenilikten Etkiye: Yeşil Sağlık Teknolojileri, Biyoteknoloji ve Sürdürülebilir Sağlığın Geleceği",
     "From Innovation to Impact: Green Health Technologies, Biotechnology and the Future of Sustainable Healthcare",
     "Paydaş paneli (kurumsal)", "Türkiye Sağlık Enstitüleri Başkanlığı (TÜSEB)",
     "Türkiye Sağlık Enstitüleri Başkanlığı (TÜSEB)",
     ["Onur Özcan", "Dr. Dilek Turan", "Dr. Esat Yinanç"], "", "Planlandı", ""),
    ("16-S1", "2026-11-16", "10:00", "11:00",
     "Hastanelerde Atık Yönetimi",
     "Waste Management in Hospitals",
     "İyi uygulama (başvuru)", "Ardahan Üniversitesi · Demiroğlu Bilim Üniversitesi",
     "Özkan Arslan",
     ["Bilge Sayın", "Birkan Tapan"],
     "Hastane yemeklerinde gıda atığı; hemşirelik hizmetlerinde atık yönetimi", "Kesin", ""),
    ("16-TED", "2026-11-16", "14:00", "15:00",
     "Tedaviden Önlemeye İklim Dirençli Sağlık Sistemleri",
     "From Treatment to Prevention: Climate-Resilient Health Systems",
     "İyi uygulama (Endüstri)", "SGGM", "Dr. Aslınur Demir",
     ["Dr. Mustafa Eröğüt", "Oğuz Çetin", "Yasemin Tecmen Stubbe"], "", "Planlandı", ""),
    ("13-S1", "2026-11-16", "16:00", "17:00",
     "Sağlıklı Çalışan, Sağlıklı Gezegen: Sanayide Kamu–Özel İş Birliğiyle İklime Dirençli Çalışan Sağlığı Gözetimi",
     "Healthy Workers, Healthy Planet: Climate-Resilient Occupational Health Surveillance through Public–Private Collaboration",
     "İyi uygulama (başvuru)", "Arçelik–Beko · KHGM", "Prof. Dr. Mustafa Necmi İlhan",
     ["Dr. Barış Seloğlu", "Dr. Mehmet Celal Almaz", "HSGM"],
     "İş sağlığı; ısı stresi; çalışan sağlığı gözetimi; kamu-özel iş birliği", "Planlandı", ""),
    ("17-S1", "2026-11-17", "10:00", "11:00",
     "İklim Dirençli Anne Sağlığı: Kadınları, Toplumları ve Sağlık Sistemlerini Güçlendirmek",
     "Climate-Resilient Maternal Health: Strengthening Women, Communities and Health Systems",
     "Uluslararası (DSÖ)", "Dünya Sağlık Örgütü (DSÖ)", "DSÖ",
     ["Dr. Gökhan Yıldırımkaya", "Türk Ebeler Derneği", "Doç. Dr. Tufan Nayır"],
     "", "Planlandı", ""),
    ("17-S2", "2026-11-17", "14:00", "15:00",
     "İklim Eylemi İçin Yeşil ve Sürdürülebilir Sağlık Hizmetleri",
     "Green and Sustainable Health Services for Climate Action",
     "Uluslararası (DSÖ)", "Dünya Sağlık Örgütü (DSÖ)", "Dünya Sağlık Örgütü (DSÖ)",
     ["Prof. Dr. Emre Korkut", "Doç. Dr. Tufan Nayır"], "", "Planlandı", ""),
    ("17-S3", "2026-11-17", "16:00", "17:00",
     "İklim Dostu İlaç Politikaları: İlaç Geliştirmeden Akılcı Kullanıma",
     "Climate-Friendly Pharmaceutical Policy: From Drug Development to Rational Use",
     "İyi uygulama (Endüstri)", "", "",
     ["Prof. Dr. Mutlu Aytemir", "Prof. Dr. Simten Malhan"], "", "Planlandı", ""),
    ("15-S1", "2026-11-18", "10:00", "11:00",
     "Tütün ve İklim (Sağlık ve Çevre İçin Ortak Kazanımlar)",
     "Tobacco and Climate",
     "Bakanlık oturumu", "HSGM", "Prof. Dr. Toker Ergüder",
     ["HSGM", "Uzm. Dr. Kevser Erdoğan", "Prof. Dr. Yasemin Açıkgöz"],
     "Tütünün çevresel yükü; izmarit; dumansız çevre", "Planlandı", ""),
    ("15-S2", "2026-11-18", "14:00", "15:00",
     "Antalya Şehir Hastanesi: İklim ve Sağlık Okuryazarlığı Öneri ve Proje Sunumu",
     "Antalya City Hospital: Climate and Health Literacy Proposals and Projects",
     "İyi uygulama (başvuru)", "Antalya Şehir Hastanesi", "",
     [], "Yeşil beceriler; sağlık okuryazarlığı", "İçerik bekleniyor", ""),
    ("18-EX", "2026-11-18", "16:00", "17:00",
     "ExpoTürk", "ExpoTürk", "Stant", "ExpoTürk", "", [], "", "Planlandı", ""),
    ("14-S2", "2026-11-19", "10:00", "11:00",
     "İklim Değişikliği ve Afetler",
     "Climate Change and Disasters",
     "İyi uygulama (başvuru)", "HSGM", "HSGM",
     ["Cihan Eryılmaz", "Hasan Yücel", "Veysel Kaan Yeşil"],
     "6 Şubat deneyimi; psikososyal dayanıklılık; afetlerde gençler", "Planlandı", ""),
    ("19-EX1", "2026-11-19", "14:00", "15:00",
     "ExpoTürk", "ExpoTürk", "Stant", "ExpoTürk", "", [], "", "Planlandı", ""),
    ("19-EX2", "2026-11-19", "16:00", "17:00",
     "ExpoTürk", "ExpoTürk", "Stant", "ExpoTürk", "", [], "", "Planlandı", ""),
    ("20-S1", "2026-11-20", "14:00", "15:00",
     "COP31 Yolunda İklim Dostu Kamu Sağlığı: Ağız ve Diş Sağlığı Hizmetlerinde Yeşil Yönetişim ve İklim Duyarlı İnsan Kaynağı",
     "Climate-Friendly Public Health on the Road to COP31: Green Governance and a Climate-Sensitive Workforce in Oral Health Services",
     "İyi uygulama (başvuru)", "Konya İl Sağlık Müdürlüğü", "SGGM",
     ["Prof. Dr. H. Tuğba Eroğlu", "Dr. Kıymet Çakır", "Dr. Dt. Cemile Soğancı"],
     "Ağız ve diş sağlığında yeşil yönetişim; iklim duyarlı insan kaynağı", "Kesin", ""),
]

BLOCKS = [("09:00", "12:00"), ("12:00", "15:00"), ("15:00", "18:00")]
OPEN = ["09", "10", "13", "14", "15", "16", "17", "18", "19", "20"]
HSGM = "Halk Sağlığı Genel Müdürlüğü (HSGM)"


def day(num: str) -> str:
    return f"2026-11-{num}"


def fill(stands, num, stand, name, slots=None):
    chosen = slots or BLOCKS
    for start, end in chosen:
        stands.append({"date": day(num), "stand": stand, "name": name, "start": start, "end": end})


def main():
    sessions = []
    for row in RAW:
        code, date, start, end, title, title_en, kind, host, moderator, speakers, topics, status, note = row
        sessions.append({
            "code": code, "date": date, "start": start, "end": end,
            "title": title, "titleEn": title_en, "theme": THEMES[date]["tr"],
            "kind": kind, "host": host, "moderator": moderator, "speakers": speakers,
            "topics": topics, "status": status, "note": note,
        })

    stands = []
    for num in OPEN:
        fill(stands, num, "Stant 1", HSGM)
        fill(stands, num, "Stant 2", "TÜSEB")
        fill(stands, num, "Stant 3", "USHAŞ")
    firms = {
        "09": ("Antalya İl Sağlık Müdürlüğü", "Antalya Şehir Hastanesi"),
        "10": ("KHGM", "SYGM"),
        "13": ("ExpoTürk", "Ertunç Özcan"),
        "15": ("Ertunç Özcan", "ExpoTürk"),
        "16": ("Başkent Üniversitesi", "ExpoTürk"),
        "17": ("Başkent Üniversitesi – Çözüm Koleji", "ExpoTürk"),
        "18": ("ExpoTürk", "ExpoTürk"),
        "19": ("ExpoTürk", "ExpoTürk"),
        "20": ("ExpoTürk", "ExpoTürk"),
    }
    for num, (left, right) in firms.items():
        fill(stands, num, "Stant 4", left)
        fill(stands, num, "Stant 5", right)
    fill(stands, "14", "Stant 4", "CTF", slots=[("09:00", "12:00")])
    fill(stands, "14", "Stant 5", "ExpoTürk")

    text = "\n".join([
        "/** 20 Ekim 2026 Bir Bakışta Takvim. Mevcut oturum kartlarıyla birleştirildi. */",
        "export type PavilionSession = {",
        "  code: string;",
        "  date: string;",
        "  start: string;",
        "  end: string;",
        "  title: string;",
        "  titleEn: string;",
        "  theme: string;",
        "  kind: string;",
        "  host: string;",
        "  moderator: string;",
        "  speakers: string[];",
        "  topics: string;",
        "  status: string;",
        "  note: string;",
        "};",
        "",
        "export type PavilionStand = { date: string; stand: string; name: string; start: string; end: string };",
        "",
        "export const PAVILION_THEMES: Record<string, { tr: string; en: string }> = " + json.dumps(THEMES, ensure_ascii=False) + ";",
        "",
        'export const PAVILION_CLOSED = ["2026-11-11"];',
        "",
        "export const PAVILION_SESSIONS: PavilionSession[] = " + json.dumps(sessions, ensure_ascii=False) + ";",
        "",
        "export const PAVILION_STANDS: PavilionStand[] = " + json.dumps(stands, ensure_ascii=False) + ";",
        "",
    ])
    OUT.write_text(text, encoding="utf-8")
    print(f"sessions={len(sessions)} stands={len(stands)}")


if __name__ == "__main__":
    main()
