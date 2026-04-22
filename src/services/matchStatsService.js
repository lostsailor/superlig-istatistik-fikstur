const apiClient = require('../utils/apiClient');
const cacheManager = require('../cache/cacheManager');
const db = require('../database/db');

class MatchStatsService {
  constructor() {
    this.bulletinBaseUrl = 'https://www.sahadan.com/api/index/betting-service-bulletin-soccer-current';
    this.matchDetailBaseUrl = 'https://www.sahadan.com/api/index/match-detail';
  }

  /**
   * Tarihe göre maç listesini al
   */
  async fetchMatchesByDate(dateStr) {
    const formattedDate = dateStr.replace(/-/g, '');
    const url = `${this.bulletinBaseUrl}-${formattedDate}?a=bs&e=bss&application=mackolik.com&language=tr&country=tr&date=${dateStr}`;
    
    try {
      const data = await apiClient.get(url);
      
      if (data && data.data && data.data.soccer) {
        const soccer = data.data.soccer;
        const leagueName = soccer.title || '';
        const matches = soccer.matches || [];
        
        return { leagueName, matches };
      }
      
      return { leagueName: '', matches: [] };
    } catch (error) {
      console.error(`Maç listesi çekme hatası (${dateStr}):`, error);
      return { leagueName: '', matches: [] };
    }
  }

  /**
   * Maç detaylarını al
   */
  async fetchMatchDetail(matchUuid) {
    const url = `${this.matchDetailBaseUrl}-${matchUuid}?application=com.kokteyl.mackolik&language=tr&country=tr&e=sam&match_uuid=${matchUuid}&a=bs`;
    
    try {
      const response = await apiClient.get(url);
      
      if (response && response.data && response.data.stat_team_detailed) {
        return {
          original: response.data.stat_team_detailed,
          translated: this.translateStats(response.data.stat_team_detailed)
        };
      }
      
      return null;
    } catch (error) {
      console.error(`Maç detayı çekme hatası (${matchUuid}):`, error);
      return null;
    }
  }

  /**
   * İstatistikleri Türkçeye çevir
   */
  translateStats(stats) {
    const typeTranslationMap = {
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
    };

    const translated = {};

    // fh, sh, a arraylerini işle
    for (const [key, value] of Object.entries(stats)) {
      if (Array.isArray(value)) {
        // Her array içindeki objelerin type alanını çevir
        translated[key] = value.map(item => {
          const translatedItem = { ...item };
          if (item.type && typeTranslationMap[item.type]) {
            translatedItem.type = typeTranslationMap[item.type];
          }
          return translatedItem;
        });
      } else {
        translated[key] = value;
      }
    }

    return translated;
  }

  /**
   * Maç istatistiklerini getir (önce cache, sonra veritabanı, sonra API)
   */
  async getMatchStats(matchUuid) {
    const cacheKey = `match_stats_${matchUuid}`;

    // Cache kontrol
    const cached = cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Veritabanı kontrol
    const dbStats = db.getMatchStats(matchUuid);
    if (dbStats) {
      cacheManager.set(cacheKey, dbStats);
      return dbStats;
    }

    // API'den çek
    const matchDetail = await this.fetchMatchDetail(matchUuid);
    if (matchDetail) {
      // Cache'e kaydet
      cacheManager.set(cacheKey, matchDetail);

      // Fixture'dan maç bilgilerini al
      const fixture = db.getFixture(matchUuid);
      const matchDate = fixture?.match_date || new Date().toISOString().split('T')[0];
      const homeTeam = fixture?.home_team || '';
      const awayTeam = fixture?.away_team || '';

      // Veritabanına kaydet
      db.saveMatchStats(
        matchUuid,
        matchDate,
        homeTeam,
        awayTeam,
        matchDetail.original,
        matchDetail.translated
      );

      return matchDetail;
    }

    return null;
  }

  /**
   * Günlük maç istatistiklerini güncelle
   */
  async updateDailyMatchStats() {
    const today = new Date().toISOString().split('T')[0];
    console.log(`Günlük maç istatistikleri güncelleniyor (${today})...`);
    
    try {
      const { matches } = await this.fetchMatchesByDate(today);
      
      for (const match of matches) {
        const matchUuid = match.uuid || match.id;
        if (matchUuid) {
          const matchDetail = await this.fetchMatchDetail(matchUuid);
          if (matchDetail) {
            const cacheKey = `match_stats_${matchUuid}`;
            cacheManager.set(cacheKey, matchDetail);
            
            db.saveMatchStats(
              matchUuid,
              today,
              match.home_team || match.homeTeam || '',
              match.away_team || match.awayTeam || '',
              matchDetail.original,
              matchDetail.translated
            );
          }
        }
      }
      
      console.log('Günlük maç istatistikleri güncellendi');
    } catch (error) {
      console.error('Günlük maç istatistikleri güncelleme hatası:', error);
    }
  }

  /**
   * Geçmiş veri tamamlama (2 yıl geriye)
   */
  async backfillHistoricalData() {
    const today = new Date();
    const twoYearsAgo = new Date(today);
    twoYearsAgo.setFullYear(today.getFullYear() - 2);

    console.log(`Geçmiş veri tamamlama başlatılıyor (${twoYearsAgo.toISOString().split('T')[0]} - ${today.toISOString().split('T')[0]})...`);

    const currentDate = new Date(twoYearsAgo);
    let processedCount = 0;

    while (currentDate <= today) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      try {
        const { matches } = await this.fetchMatchesByDate(dateStr);
        
        for (const match of matches) {
          const matchUuid = match.uuid || match.id;
          
          // Veritabanında var mı kontrol et
          const existing = db.getMatchStats(matchUuid);
          if (!existing) {
            const matchDetail = await this.fetchMatchDetail(matchUuid);
            if (matchDetail) {
              const cacheKey = `match_stats_${matchUuid}`;
              cacheManager.set(cacheKey, matchDetail);
              
              db.saveMatchStats(
                matchUuid,
                dateStr,
                match.home_team || match.homeTeam || '',
                match.away_team || match.awayTeam || '',
                matchDetail.original,
                matchDetail.translated
              );
              
              processedCount++;
              console.log(`İşlendi: ${dateStr} - ${matchUuid}`);
            }
          }
        }
      } catch (error) {
        console.error(`Tarih işleme hatası (${dateStr}):`, error);
      }

      // Bir sonraki güne geç
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(`Geçmiş veri tamamlama tamamlandı. Toplam ${processedCount} maç işlendi.`);
  }

  /**
   * Tarihe göre maç istatistiklerini getir
   */
  async getMatchStatsByDate(dateStr) {
    // Cache kontrol
    const cacheKey = `match_stats_date_${dateStr}`;
    const cached = cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Veritabanı kontrol
    const dbStats = db.getMatchStatsByDate(dateStr);
    if (dbStats && dbStats.length > 0) {
      cacheManager.set(cacheKey, dbStats);
      return dbStats;
    }

    // API'den çek
    const { matches } = await this.fetchMatchesByDate(dateStr);
    const results = [];

    for (const match of matches) {
      const matchUuid = match.uuid || match.id;
      const matchDetail = await this.fetchMatchDetail(matchUuid);
      if (matchDetail) {
        results.push({
          match_uuid: matchUuid,
          match_date: dateStr,
          home_team: match.home_team || match.homeTeam || '',
          away_team: match.away_team || match.awayTeam || '',
          stat_team_detailed: matchDetail.original,
          stat_team_detailed_tr: matchDetail.translated
        });
        
        db.saveMatchStats(
          matchUuid,
          dateStr,
          match.home_team || match.homeTeam || '',
          match.away_team || match.awayTeam || '',
          matchDetail.original,
          matchDetail.translated
        );
      }
    }

    cacheManager.set(cacheKey, results);
    return results;
  }
}

module.exports = new MatchStatsService();
