

# FIKSTUR
https://www.sahadan.com/lig/trendyol-super-lig/482ofyysbdbeoxauk19yg7tdt/fikstur içerisindeki DOM'da bir JSON var buna göre fikstürü alacağız.

# PUAN DURUMU

https://www.sahadan.com/lig/trendyol-super-lig/482ofyysbdbeoxauk19yg7tdt adresindeki sayfada https://www.sahadan.com/api/index/country-area-6kd6webenogylfgwt2aa9l6vx ile başlayan endpointten lig bilgilerini alacağız. Bunlar bizim puan durumumuzda kullanılacak. Bunu 30 dakikada bir kontrol edeceğiz. Cache'e kaydedeceğiz.

# MAÇ İSTATİSTİKLERİ

İçinde bulunduğumuz günü 30 dakikada bir kontrol edeceğiz. Cache ve veritabanına kaydedeceğiz.
cache boyutu 1gb olacak. Cache'de en eski kayıtları silerek yer açacağız.
cache'de olmayan maçlar için veritabanına bakacağız.
veritabanında da yoksa API'den çekip cache'e ve veritabanına kaydedeceğiz.
Otomatik geçmiş veri tamamlama işlemi iki yıla kadar geriye doğru çalışacak. Her istek arasında 3 ila 10 saniye arasında rastgele bekleme süresi ekleyeceğiz.

```
20260419 tarihi için https://www.sahadan.com/api/index/betting-service-bulletin-soccer-current-20260419?a=bs&e=bss&application=mackolik.com&language=tr&country=tr&date=2026-04-19 istek atacağız.
Gelen response'dan data > soccer > title içinden lig adını alacağız.
Gelen response'dan data > soccer > matches içinden maç uuidlerini alacağız.

4l7u8xcjrptlo0te85spnio7o maç uuid'si için https://www.sahadan.com/api/index/match-detail-4l7u8xcjrptlo0te85spnio7o?application=com.kokteyl.mackolik&language=tr&country=tr&e=sam&match_uuid=4l7u8xcjrptlo0te85spnio7o&a=bs istek atacağız.
Gelen response'dan stat_team_detailed objesini alacağız. Bunu cache'e ve veritabanına kaydedeceğiz.
```

# EK İSTERLER
datayı anlamlandırmak için hem orjinali hem de türkçe key isimleri eklenmeli.
Bize gelen istekleri hemen işleyelim.
