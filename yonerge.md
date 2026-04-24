FastAPI ve json kullanarak bir API servisi kurulacak.(JSON dosya DB olarak kullanılacak) 

sistem açılışında dbde varsa cache yüklenecek. 
Veri güncelleme başlangıçta ve  her saat 57-59 arası güncelleme yapılacak
Aşağıdaki yapı çalışacak ve veriler cache'de tutulacak DB'de güncellenecek.
Bizden hizmet alan uygulamalar bu cache'den veri çekecek.
```
https://www.sahadan.com/api/index/soccer-competition-482ofyysbdbeoxauk19yg7tdt?a=bs&e=sac&competition_uuid=482ofyysbdbeoxauk19yg7tdt&language=tr&country=tr&application=mackolik.com
bu linkten gamesets ve rankingleri alacağız. (form_tables, rankings_live, transfers, stat_top_teams, stat_top_players, team_stats, player_stats kısımları çıkarılacak.)

gamesets arrayi içindeki her bir gameset için matches arrayi var. Bu matches arrayi içindeki her bir match için maç detayını ekleyeceğiz.
maç detayı için https://www.sahadan.com/api/index/match-detail-{matchUuid}?application=com.kokteyl.mackolik&language=tr&country=tr&e=sam&match_uuid={matchUuid}&a=bs kullanabiliriz.

fixtür ve gamesets için tek bir endpoint sunulacak. (parametre olarak gameset verilirse o gameset'in maçları getirilecek, gameset verilmezse tüm fixtür getirilecek)
rankingler için de tek bir endpoint sunulacak.
```

Şunun gibi bir dönüşüm tablosu kullanılarak türkçe veriler de yerleştirilmiş olacak:
´´´
      'possession': 'Topla oynama',
      'expected_goals': 'Beklenen gol',
      'touches_in_opp_box': 'Rakip ceza sahası dokunma',
      'shots': 'Şut',
      'shots_on_target': 'İsabetli şut',
      'shots_off_target': 'İsabetsiz şut',
      'corners': 'Korner',
      'fouls': 'Faul',
      'blocked_shots': 'Bloklanan şut',
      'woodwork': 'Direk',
      'big_chances_missed': 'Kaçırılan büyük fırsat',
      'throw_in': 'Aut',
      'passes': 'Pas',
      'successful_passes': 'Başarılı pas',
      'crosses': 'Orta',
      'successful_tackles': 'Başarılı müdahaleler',
      'successful_duels': 'Kazanılan ikili mücadeleler',
      'successful_aerial_duels': 'Kazanılan hava mücadeleleri',
      'successful_takeons': 'Başarılı adam geçmeler',
      'clearances': 'Topu uzaklaştırma',
      'interceptions': 'Top kesme',
      'total_offside': 'Toplam ofsayt',
      'successful_crosses': 'Başarılı orta',
      'yellow_card': 'Sarı kart',
      'second_yellow_card': 'İkinci sarı kart',
      'direct_red_card': 'Doğrudan kırmızı kart',
      'red_card': 'Kırmızı kart',
      'passing_accuracy': 'Pas başarısı',
      'running_distance': 'Koşu mesafesi'
´´´


