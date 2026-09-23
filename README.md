# COP31 Sağlık Pavilionu Hazırlık

T.C. Sağlık Bakanlığı (SGGM) COP31 Antalya yeşil alan / Health Pavilion hazırlık ve program yönetim uygulaması.

## Roller

- **Admin** — tüm modüller, Excel senkron, anons, kullanıcı görünümü
- **Sağlık Bakanlığı** — to-do, takvim, gündem, paneller, firmalar, Q&A
- **Firma** — kendi profili, atanan kurallar, takvim/başvuru, mesaj, açık soru-cevap

## Çalıştırma

```bash
npm install
npm run db:setup
npm run dev
```

Tarayıcı: http://localhost:3000

Demo şifre: `Cop31!2026`

| Rol | E-posta |
| --- | --- |
| Admin | admin@cop31.saglik.gov.tr |
| Sağlık Bakanlığı | sggm@cop31.saglik.gov.tr |
| Firma | atabay-ilac@firma.cop31.tr, sanofi@firma.cop31.tr, … |

## Excel bağlantısı

To-do sayfasında **Excel'den çek** Google Sheet'i indirir ve satır numarasına göre birleştirir. **Excel yükle** / **Excel indir** çift yönlü düzenlemeye izin verir.

SMTP tanımlı değilse anonslar uygulama içi kutuya anlık düşer; e-posta günlüğünde “Simüle edildi” olarak görünür. `.env` içine `SMTP_HOST` ekleyerek gerçek gönderim açılır.
