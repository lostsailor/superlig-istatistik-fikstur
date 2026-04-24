# Süper Lig İstatistik Fikstür API

FastAPI tabanlı Türk Süper Lig fikstür ve istatistik servisi. JSON dosyası veritabanı olarak kullanılır.

## Özellikler

- Sahadan.com API'sinden maç fikstürü ve sıralama verilerini çeker
- Her maç için detaylı istatistik bilgilerini toplar
- İstatistikleri Türkçe'ye çevirir
- Verileri bellekte (cache) tutar ve JSON dosyasına kaydeder
- Her saatin 57. dakikasında otomatik veri güncellemesi yapar
- Sistem açılışında veritabanından cache yükler

## Kurulum

1. Sanal ortam oluşturun:
```bash
python -m venv venv
```

2. Sanal ortamı aktifleştirin:
```bash
venv\Scripts\activate
```

3. Bağımlılıkları yükleyin:
```bash
pip install -r requirements.txt
```

4. `.env` dosyası oluşturun:
```bash
copy .env.example .env
```

## Çalıştırma

```bash
python main.py
```

veya

```bash
uvicorn main:app --reload
```

## API Endpoints

### Fikstür Al
```
GET /api/fixture
```
Tüm gameset'leri ve maçları döndürür.

### Belirli Gameset
```
GET /api/fixture?gameset_uuid={uuid}
```
Belirtilen gameset'in maçlarını döndürür.

### Sıralamalar
```
GET /api/rankings
```
Tüm sıralama tablolarını döndürür.

### Sağlık Kontrolü
```
GET /api/health
```
Servis durumunu ve cache durumunu döndürür.

## Proje Yapısı

```
.
├── app/
│   ├── __init__.py
│   ├── models.py           # Pydantic modelleri
│   ├── translations.py    # Türkçe çeviri tablosu
│   ├── cache_manager.py    # Bellek cache yönetimi
│   ├── db_manager.py       # JSON veritabanı yönetimi
│   ├── sahadan_service.py  # Sahadan API servisi
│   ├── scheduler.py        # Zamanlanmış görevler
│   └── routes.py           # API rotaları
├── data/
│   └── database.json       # JSON veritabanı (otomatik oluşturulur)
├── main.py                 # Ana uygulama
├── requirements.txt        # Python bağımlılıkları
└── .env                    # Çevre değişkenleri
```
