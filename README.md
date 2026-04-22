# Süper Lig İstatistik ve Fikstür Servisi

Süper Lig için fikstür, puan durumu ve maç istatistiklerini sağlayan REST API servisi.

## Özellikler

- **Fikstür**: Sahadan.com'dan DOM scraping ile fikstür bilgilerini alır
- **Puan Durumu**: API'den lig bilgilerini alır, 30 dakikada bir günceller
- **Maç İstatistikleri**: Günlük maç istatistiklerini takip eder, 30 dakikada bir günceller
- **Geçmiş Veri Tamamlama**: 2 yıl geriye doğru otomatik veri tamamlama
- **Cache**: 1GB limitli cache sistemi (FIFO eviction)
- **Rate Limiting**: Her API isteği arasında 3-10 saniye rastgele bekleme
- **Veritabanı**: SQLite ile kalıcı veri saklama

## Kurulum

```bash
# Bağımlılıkları yükle
npm install

# Server'ı başlat
npm start
```

## API Endpoint'leri

### Fikstür
```
GET /api/fixtures              - Tüm fikstürü getir
GET /api/fixtures/:matchUuid   - Belirli bir maçın fikstürünü getir
```

### Puan Durumu
```
GET /api/standings             - Puan durumunu getir
```

### Maç İstatistikleri
```
GET /api/match-stats/:matchUuid        - Belirli bir maçın istatistiklerini getir
GET /api/match-stats/date/:date        - Tarihe göre maç istatistiklerini getir (YYYY-MM-DD)
```

### Cache Yönetimi
```
GET /api/cache/stats          - Cache durumunu getir
POST /api/cache/clear         - Cache'i temizle
```

### Geçmiş Veri Tamamlama
```
POST /api/backfill             - Geçmiş veri tamamlamayı başlat (2 yıl geriye)
```

## Proje Yapısı

```
.
├── index.js                  # Ana uygulama dosyası
├── package.json              # Proje bağımlılıkları
├── src/
│   ├── cache/
│   │   └── cacheManager.js   # Cache yönetimi (1GB limit)
│   ├── database/
│   │   └── db.js             # SQLite veritabanı işlemleri
│   ├── routes/
│   │   └── index.js          # API route'ları
│   ├── services/
│   │   ├── fixtureService.js    # Fikstür servisi
│   │   ├── standingsService.js  # Puan durumu servisi
│   │   └── matchStatsService.js  # Maç istatistikleri servisi
│   └── utils/
│       └── apiClient.js      # API client (rate limiting ile)
├── data/                     # Veritabanı dosyaları
└── yonerge.md                # Proje yönergesi
```

## Otomatik Güncellemeler

- **Puan Durumu**: Her 30 dakikada bir otomatik güncellenir
- **Maç İstatistikleri**: Her 30 dakikada bir günlük maçlar için güncellenir
- **Geçmiş Veri**: Manuel olarak tetiklenebilir (2 yıl geriye)

## Veri Yapısı

### Maç İstatistikleri
Hem orijinal hem de Türkçe key isimleri döner:
- `stat_team_detailed`: Orijinal API verisi
- `stat_team_detailed_tr`: Türkçe çevrilmiş veri

## Port

Varsayılan port: 3000
Ortam değişkeni `PORT` ile değiştirilebilir.

## Lisans

ISC
