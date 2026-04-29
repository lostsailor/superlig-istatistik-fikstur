# Futbol Maç Veri Sistemi API Dokümantasyonu

## Genel Bakış

Bu sistem, futbol maç verilerini otomatik olarak çeken, işleyen ve MongoDB'de depolayan bir API sunucusudur. Sistem, maç detaylarını otomatik olarak senkronize eder ve RESTful arayüz üzerinden veri erişimi sağlar.

## Sunucu Özellikleri

- **Port:** 3000
- **Veritabanı:** MongoDB (localhost:27017)
- **Database:** futbol_mac_data
- **Otomatik Senkronizasyon:** Saatlik ve günlük cron job'lar

## API Endpoint'leri

### 1. Ana Sayfa
```
GET /
```
**Açıklama:** Sunucu durumunu kontrol etmek için basit bir karşılama mesajı döner.

**Örnek Yanıt:**
```json
"Hello World!"
```

### 2. API Bilgi
```
GET /api
```
**Açıklama:** API endpoint bilgisi döner.

**Örnek Yanıt:**
```json
"This is the API endpoint"
```

### 3. Lig Verisi Alma
```
GET /api/get-league-data
```
**Açıklama:** Tüm lig verilerini veya belirli bir haftanın verilerini döner.

**Query Parametreleri:**
- `week` (opsiyonel): Belirli bir haftanın verilerini filtreler
  - Örnek: `?week=25` (25. hafta maçları)
  - Parametre boş bırakılırsa tüm veriler döner

**Örnek İstekler:**
```bash
# Tüm verileri getir
GET /api/get-league-data

# Sadece 25. haftayı getir
GET /api/get-league-data?week=25
```

**Örnek Yanıt:**
```json
{
  "gamesets": [
    {
      "name": "25",
      "matches": [
        {
          "uuid": "7febjj2rdpi5cro52e4gced5g",
          "team_A": {
            "name": "Çaykur Rizespor",
            "uuid": "1lbrlj3uu8wi2h9j79snuoae4"
          },
          "team_B": {
            "name": "Başakşehir", 
            "uuid": "47njg6cmlx5q3fvdsupd2n6qu"
          },
          "status": "Played",
          "date_time_utc": "2025-10-22 17:00:00"
        }
      ]
    }
  ]
}
```

### 4. Maç Detayları Alma
```
GET /api/match-details
```
**Açıklama:** Belirli bir maçın detaylı bilgisini döner. Eğer maç detayı veritabanında yoksa, otomatik olarak çeker ve kaydeder.

**Query Parametreleri:**
- `matchId` (zorunlu): Maç UUID'si

**Örnek İstek:**
```bash
GET /api/match-details?matchId=7febjj2rdpi5cro52e4gced5g
```

**Örnek Yanıt:**
```json
{
  "_id": "69f1e2fb7fae7d897cd1daaf",
  "match": {
    "uuid": "7febjj2rdpi5cro52e4gced5g",
    "team_A": {
      "name": "Çaykur Rizespor",
      "display_name": "Ç. Rizespor"
    },
    "team_B": {
      "name": "Başakşehir",
      "display_name": "Başakşehir"
    },
    "status": "Played",
    "venue": {
      "name": "Çaykur Didi Stadyumu",
      "capacity": 15558
    },
    "date_time_utc": "2025-10-22 17:00:00"
  },
  "stat_team_detailed": {
    "fh": [
      {
        "type": "Topla oynama",
        "team_A_value": 50,
        "team_B_value": 50
      }
    ],
    "sh": [...],
    "a": [...]
  },
  "events": [
    {
      "type": "G",
      "minute": 89,
      "team": "B",
      "scorer": {
        "name": "Oyuncu Adı"
      }
    }
  ],
  "lineup": {
    "team_A": {
      "formation": 4231,
      "players": [...]
    },
    "team_B": {...}
  }
}
```

## Veri Yapısı

### Maç Detayları Alanları

- **match:** Temel maç bilgileri (tarih, stat, takımlar, skor vb.)
- **stat_team_detailed:** Detaylı istatistikler
  - `fh`: İlk yarı istatistikleri
  - `sh`: İkinci yarı istatistikleri  
  - `a`: Maç geneli istatistikleri
- **events:** Maç olayları (goller, kartlar, değişiklikler)
- **lineup:** Kadro bilgileri ve oyuncu değerlendirmeleri

### İstatistik Türleri (Türkçe)

Sistem, istatistik türlerini otomatik olarak İngilizce'den Türkçe'ye çevirir:
- Ball possession → Topla oynama
- Expected goals → Beklenen gol
- Shots → Şut
- Passes → Pas
- Yellow card → Sarı kart
- Red card → Kırmızı kart
- ve daha fazlası...

## Otomatik Özellikler

### 1. Otomatik Veri Çekme
- **Başlangıçta:** Sunucu başladığında eksik maç detaylarını otomatik çeker
- **Saatlik:** Her saat başı oynanmış maçların detaylarını kontrol eder
- **Günlük:** Her gece 02:00'da tam senkronizasyon yapar

### 2. Hata Yönetimi ve Retry Mekanizması
- API hatalarında otomatik tekrar deneme (max 5 kez)
- 3 saniye bekleme süresi ile retry
- HTML yanıtlarını tespit etme ve yeniden deneme
- JSON parse hatalarını yönetme

### 3. Veri Depolama
- **MongoDB Koleksiyonları:**
  - `competition_data`: Lig ve maç listesi
  - `match_details`: Detaylı maç bilgileri

## Kullanım Örnekleri

### Frontend Entegrasyonu

```javascript
// Tüm lig verilerini çek
async function getAllLeagueData() {
  const response = await fetch('/api/get-league-data');
  return await response.json();
}

// Belirli haftayı çek
async function getWeekData(week) {
  const response = await fetch(`/api/get-league-data?week=${week}`);
  return await response.json();
}

// Maç detaylarını çek
async function getMatchDetails(matchId) {
  const response = await fetch(`/api/match-details?matchId=${matchId}`);
  return await response.json();
}
```

### Veri Akışı

1. **Veri Çekme:** `fetch_data.js` ile ana lig verisi çekilir
2. **Detay Çekme:** `fetch_match_detail.js` ile maç detayları çekilir
3. **Veritabanı Kayıt:** MongoDB'ye otomatik kayıt edilir
4. **API Sunumu:** RESTful API ile istemcilere sunulur

## Hata Mesajları

### Yaygın Hatalar
- **"Data not found, fetching..."**: Maç detayı bulunamadı, otomatik çekiliyor
- **"API returned HTML instead of JSON"**: API HTML yanıtı döndü, tekrar deneniyor
- **"JSON parse error"**: JSON parse hatası, tekrar deneniyor

### Çözüm Önerileri
- Sunucunun çalıştığından emin olun
- MongoDB'nin aktif olduğundan emin olun
- İnternet bağlantısını kontrol edin
- API limitlerine ulaşılmadığını kontrol edin

## Performans Optimize

- **Batch Processing:** 6 eşzamanlı istek ile maç detayları çekilir
- **Caching:** MongoDB'de önbellekleme yapılır
- **Rate Limiting:** API aşırı yüklenmesini önlemek için bekleme süreleri
- **Retry Logic:** Geçici hatalarda otomatik yeniden deneme

## Güvenlik

- MongoDB bağlantıları güvenli modda çalışır
- API istekleri doğrulanır
- Hata mesajları hassas bilgi içermez

---

**Not:** Bu API, sahadan.com verilerini kullanır ve otomatik olarak güncellenir. Sunucu başladığında ilk senkronizasyon otomatik olarak gerçekleştirilir.
