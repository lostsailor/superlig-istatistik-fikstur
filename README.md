# Süper Lig İstatistik ve Fikstür Sistemi

MongoDB tabanlı, otomatik veri senkronizasyonlu futbol maç veri sistemi.

## 🚀 Özellikler

- **Otomatik Veri Çekme:** Sahadan.com'dan lig verisi ve maç detaylarını otomatik çeker
- **MongoDB Entegrasyonu:** Tüm verileri MongoDB'de depolar
- **RESTful API:** JSON formatında veri erişimi sağlar
- **Otomatik Senkronizasyon:** Cron job ile periyodik veri güncellemesi
- **Retry Mekanizması:** API hatalarında otomatik tekrar deneme
- **Türkçe İstatistik:** İstatistik türlerini otomatik çevirir
- **Batch Processing:** 6 eşzamanlı istek ile performans optimizasyonu

## 📋 Gereksinimler

- Node.js (v14+)
- MongoDB (localhost:27017)
- İnternet bağlantısı (Sahadan.com API erişimi)

## 🛠️ Kurulum

1. **Depoyu klonlayın:**
```bash
git clone https://github.com/hakanbisgin/superlig-istatistik-fikstur.git
cd superlig-istatistik-fikstur
```

2. **Bağımlılıkları yükleyin:**
```bash
npm install
```

3. **MongoDB'yi başlatın:**
```bash
# Windows services üzerinden veya
mongod
```

4. **Sunucuyu çalıştırın:**
```bash
npm start
```

## 📁 Proje Yapısı

```
├── server.js              # Express API sunucusu
├── fetch_data.js          # Lig verisi çekme script'i
├── fetch_match_detail.js  # Maç detayı çekme script'i
├── package.json           # Proje bağımlılıkları
├── API_DOKUMANI.md        # API dokümantasyonu
├── README.md              # Bu dosya
└── data/                  # JSON veri dosyaları (gitignore'da)
```

## 🔧 API Endpoint'leri

### Ana Sayfa
```
GET /
```

### Lig Verisi
```
GET /api/get-league-data?week=25
```
- `week` (opsiyonel): Belirli haftayı filtreler

### Maç Detayları
```
GET /api/match-details?matchId=uuid
```
- `matchId` (zorunlu): Maç UUID'si

## ⚙️ Otomatik Özellikler

### Senkronizasyon Zamanlaması
- **Başlangıçta:** Sunucu başladığında anında senkronizasyon
- **Saatlik:** Her saat başi oynanmış maçları kontrol eder
- **Günlük:** Her gece 02:00'da tam senkronizasyon

### Retry Mekanizması
- **Maksimum deneme:** 5 kez
- **Bekleme süresi:** 3 saniye
- **Hata türleri:** HTML yanıtları, JSON parse hataları, bağlantı hataları

## 📊 Veri Yapısı

### Lig Verisi
```json
{
  "gamesets": [
    {
      "name": "25",
      "matches": [
        {
          "uuid": "match-uuid",
          "team_A": { "name": "Takım A" },
          "team_B": { "name": "Takım B" },
          "status": "Played",
          "date_time_utc": "2025-10-22 17:00:00"
        }
      ]
    }
  ]
}
```

### Maç Detayları
```json
{
  "match": { /* maç bilgileri */ },
  "stat_team_detailed": {
    "fh": [ /* ilk yarı istatistikleri */ ],
    "sh": [ /* ikinci yarı istatistikleri */ ],
    "a": [ /* maç geneli istatistikleri */ ]
  },
  "events": [ /* maç olayları */ ],
  "lineup": { /* kadro bilgileri */ }
}
```

## 🌐 Kullanım Örnekleri

### Frontend Entegrasyonu
```javascript
// Tüm lig verileri
const allData = await fetch('/api/get-league-data');

// Belirli hafta
const week25 = await fetch('/api/get-league-data?week=25');

// Maç detayları
const matchDetails = await fetch('/api/match-details?matchId=uuid');
```

### Manuel Veri Çekme
```bash
# Lig verisi çek
node fetch_data.js

# Belirli maç detayı çek
node fetch_match_detail.js match-uuid

# Özel retry sayısı ile
node fetch_match_detail.js match-uuid 10
```

## 🔍 İstatistik Çevirileri

Sistem, İngilizce istatistik türlerini otomatik olarak Türkçe'ye çevirir:
- Ball possession → Topla oynama
- Expected goals → Beklenen gol
- Shots → Şut
- Passes → Pas
- Yellow card → Sarı kart
- ve daha fazlası...

## 🗄️ MongoDB Koleksiyonları

- **competition_data:** Lig ve maç listesi
- **match_details:** Detaylı maç bilgileri

### Veritabanı Yapısı
```javascript
// competition_data
{
  _id: ObjectId,
  gamesets: [...],
  rankings: [...]
}

// match_details
{
  _id: ObjectId,
  match: { uuid: "match-uuid", ... },
  stat_team_detailed: {...},
  events: [...],
  lineup: {...}
}
```

## 🐛 Hata Yönetimi

Sistem aşağıdaki hata durumlarını otomatik yönetir:
- API geçici hatalarında retry
- MongoDB bağlantı sorunlarında yeniden deneme
- HTML yanıt tespiti ve yeniden deneme
- JSON parse hatalarında kurtarma

## 📈 Performans

- **Batch Processing:** 6 eşzamanlı istek
- **Caching:** MongoDB önbellekleme
- **Rate Limiting:** API limitlerini koruma
- **Optimized Queries:** Verimli MongoDB sorguları

## 🔐 Güvenlik

- MongoDB güvenli mod bağlantıları
- API istek doğrulaması
- Hassas bilgi içermeyen hata mesajları
- Girdi sanitizasyonu

## 📝 API Dokümantasyonu

Detaylı API dokümantasyonu için [API_DOKUMANI.md](API_DOKUMANI.md) dosyasını inceleyin.

## 🤝 Katkı

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/AmazingFeature`)
3. Değişiklikleri commit edin (`git commit -m 'Add some AmazingFeature'`)
4. Branch'e push edin (`git push origin feature/AmazingFeature`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje MIT Lisansı altında dağıtılmaktadır.

## 🆘 Destek

Sorunlar veya öneriler için:
- GitHub Issues üzerinden issue oluşturun
- API dokümantasyonunu inceleyin
- Log mesajlarını kontrol edin

---

**Geliştirme Notları:**
- Sistem Sahadan.com API'sini kullanır
- Veriler otomatik olarak güncellenir
- MongoDB localhost:27017'de çalışır
- Sunucu port 3000'de çalışır
