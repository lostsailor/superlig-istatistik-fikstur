const puppeteer = require('puppeteer');
const cacheManager = require('../cache/cacheManager');
const db = require('../database/db');

class FixtureService {
  constructor() {
    this.fixtureUrl = 'https://www.sahadan.com/lig/trendyol-super-lig/482ofyysbdbeoxauk19yg7tdt/fikstur';
    this.bulletinBaseUrl = 'https://www.sahadan.com/api/index/betting-service-bulletin-soccer-current';
    this.competitionUuid = '482ofyysbdbeoxauk19yg7tdt';
  }

  /**
   * Fikstür verisini temizle - sadece maç bilgilerini al
   */
  cleanFixtureData(rawData) {
    try {
      console.log('Gelen veri anahtarları:', Object.keys(rawData).slice(0, 20));
      
      // Veri yapısını kontrol et
      let matches = [];
      
      // Farklı veri yapılarını destekle
      if (rawData.data && rawData.data.matches) {
        matches = rawData.data.matches;
        console.log('rawData.data.matches bulundu, sayısı:', matches.length);
      } else if (rawData.matches) {
        matches = rawData.matches;
        console.log('rawData.matches bulundu, sayısı:', matches.length);
      } else if (rawData.data && rawData.data.fixtures) {
        matches = rawData.data.fixtures;
        console.log('rawData.data.fixtures bulundu, sayısı:', matches.length);
      } else if (rawData.fixtures) {
        matches = rawData.fixtures;
        console.log('rawData.fixtures bulundu, sayısı:', matches.length);
      } else if (rawData.data && rawData.data.data && rawData.data.data.matches) {
        matches = rawData.data.data.matches;
        console.log('rawData.data.data.matches bulundu, sayısı:', matches.length);
      } else {
        // Derin arama - iç içe objelerde maç verisi ara
        const found = this.deepSearchForMatches(rawData);
        if (found) {
          matches = found;
          console.log('Derin aramada maç verisi bulundu, sayısı:', matches.length);
        } else {
          console.log('Maç verisi bulunamadı, veri yapısı:', JSON.stringify(rawData).substring(0, 500));
        }
      }

      // Maçları temizle
      const cleanedMatches = matches.map((match, index) => {
        // Ev sahibi ve deplasman takım bilgilerini çıkar
        const homeTeam = match.home_team || match.homeTeam || match.home || (match.teams && match.teams.home);
        const awayTeam = match.away_team || match.awayTeam || match.away || (match.teams && match.teams.away);
        
        // UUID yoksa geçici oluştur
        const uuid = match.uuid || match.id || `temp_${Date.now()}_${index}`;
        
        return {
          uuid: uuid,
          date: match.date || match.match_date || match.datetime,
          status: match.status || match.match_status,
          home_team: typeof homeTeam === 'object' ? homeTeam.name : homeTeam,
          away_team: typeof awayTeam === 'object' ? awayTeam.name : awayTeam,
          home_score: match.home_score || match.score_home || match.homeScore,
          away_score: match.away_score || match.score_away || match.awayScore,
          round: match.round || match.matchday,
          venue: match.venue || match.stadium
        };
      });

      return {
        competition: rawData.data?.competition || rawData.competition,
        matches: cleanedMatches
      };
    } catch (error) {
      console.error('Fikstür verisi temizleme hatası:', error);
      return rawData;
    }
  }

  /**
   * Objeyi derinlemesine arayarak maç verisi bul
   */
  deepSearchForMatches(obj, depth = 0) {
    if (depth > 5) return null; // Max derinlik
    
    if (Array.isArray(obj)) {
      // Array'de maç verisi var mı kontrol et
      for (const item of obj) {
        if (typeof item === 'object' && item !== null) {
          const str = JSON.stringify(item);
          // Maç objesi mi kontrol et - uuid, home, away alanları var mı
          if (item.uuid || item.id) {
            if ((str.includes('home') && str.includes('away')) ||
                (item.home_team && item.away_team) ||
                (item.homeTeam && item.awayTeam)) {
              return [item];
            }
          }
          if (str.includes('matches') && Array.isArray(item.matches)) {
            return item.matches;
          }
          const result = this.deepSearchForMatches(item, depth + 1);
          if (result) return result;
        }
      }
    } else if (typeof obj === 'object' && obj !== null) {
      // Objede matches/fixture/events anahtarı var mı kontrol et
      if (obj.matches && Array.isArray(obj.matches)) {
        return obj.matches;
      }
      if (obj.fixtures && Array.isArray(obj.fixtures)) {
        return obj.fixtures;
      }
      if (obj.events && Array.isArray(obj.events)) {
        return obj.events;
      }
      
      // Tüm değerleri recursive ara
      for (const key in obj) {
        const result = this.deepSearchForMatches(obj[key], depth + 1);
        if (result) return result;
      }
    }
    
    return null;
  }

  /**
   * Tüm network requests'i kaydet
   */
  async captureNetworkRequests() {
    const browser = await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    const requests = [];
    
    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType()
      });
    });
    
    page.on('response', async response => {
      const url = response.url();
      if (url.includes('api') && url.includes('sahadan.com')) {
        try {
          const contentType = response.headers()['content-type'] || '';
          if (contentType.includes('application/json')) {
            const data = await response.json();
            requests.push({
              url: url,
              status: response.status(),
              data: data,
              keys: Object.keys(data)
            });
            console.log('API Response:', url);
            console.log('Status:', response.status());
            console.log('Keys:', Object.keys(data));
          }
        } catch (e) {
          // JSON değil
        }
      }
    });
    
    try {
      await page.goto(this.fixtureUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      console.log('Sayfa yüklendi');
      
      // 5 saniye bekle
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Requests'i kaydet
      const fs = require('fs');
      const path = require('path');
      const requestsPath = path.join(__dirname, '../../network-requests.json');
      fs.writeFileSync(requestsPath, JSON.stringify(requests, null, 2));
      console.log('Network requests kaydedildi:', requestsPath);
      console.log('Toplam istek sayısı:', requests.length);
      
      return requests;
    } catch (error) {
      console.error('Network requests kaydetme hatası:', error);
      throw error;
    } finally {
      await browser.close();
    }
  }

  /**
   * Fikstürü API'den al
   */
  async fetchFixtures() {
    const apiClient = require('../utils/apiClient');
    
    try {
      console.log('Fikstür çekiliyor (API)...');
      
      const url = `https://www.sahadan.com/api/index/soccer-competition-${this.competitionUuid}?a=bs&e=sac&competition_uuid=${this.competitionUuid}&language=tr&country=tr&application=mackolik.com`;
      
      const data = await apiClient.get(url);
      
      if (data && data.data && data.data.gamesets) {
        const gamesets = data.data.gamesets;
        const competition = data.data.competition;
        
        console.log('Gamesets sayısı:', gamesets.length);
        
        // Tüm maçları gamesets'ten çıkar
        const allMatches = [];
        for (const gameset of gamesets) {
          if (gameset.matches && Array.isArray(gameset.matches)) {
            
            const cleanedMatches = gameset.matches.map((match, index) => {
              // UUID'yi bul
              let uuid = match.uuid || match.id;
              
              // Date'i bul
              let date = match.date_time_utc || match.date || match.match_date || match.datetime;
              
              // Takım bilgilerini çıkar - team_A ve team_B objeler
              const homeTeam = match.team_A?.name || match.home_team || match.homeTeam || match.home;
              const awayTeam = match.team_B?.name || match.away_team || match.awayTeam || match.away;
              
              // Skorları çıkar - fts_A/fts_B (full time score)
              const homeScore = match.fts_A !== undefined ? match.fts_A : match.home_score || match.score_home || match.homeScore;
              const awayScore = match.fts_B !== undefined ? match.fts_B : match.away_score || match.score_away || match.awayScore;
              
              if (!uuid) {
                console.log('UUID yok, match anahtarları:', Object.keys(match));
                uuid = `temp_${Date.now()}_${index}`;
              }
              
              return {
                uuid: uuid,
                date: date,
                status: match.status || match.match_status,
                home_team: homeTeam,
                away_team: awayTeam,
                home_score: homeScore,
                away_score: awayScore,
                round: match.round ? match.round.name : match.matchday,
                venue: match.venue || match.stadium
              };
            });
            
            allMatches.push(...cleanedMatches);
          }
        }
        
        console.log('Toplam maç:', allMatches.length);
        
        // Tarihe göre sırala
        allMatches.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        const result = {
          competition: {
            name: competition.name,
            uuid: competition.uuid
          },
          matches: allMatches
        };
        
        // Cache'e kaydet
        cacheManager.set('fixtures', result);
        
        // Veritabanına kaydet
        for (const match of allMatches) {
          db.saveFixture(
            match.uuid,
            match.date,
            match.home_team,
            match.away_team,
            match
          );
        }
        
        return result;
      }
      
      return null;
    } catch (error) {
      console.error('Fikstür çekme hatası:', error);
      throw error;
    }
  }

  /**
   * Fikstürü getir
   */
  async getFixtures(competitionUuid = null) {
    // Competition UUID parametresi varsa, competitionUuid'yi güncelle
    if (competitionUuid) {
      this.competitionUuid = competitionUuid;
    }

    // Cache kontrol
    const cached = cacheManager.get('fixtures');
    if (cached) {
      console.log('Fikstür cache\'den geldi');
      return cached;
    }

    // Veritabanı kontrol
    const dbFixtures = db.getAllFixtures();
    if (dbFixtures && dbFixtures.length > 0) {
      console.log('Fikstür veritabanından geldi, kayıt sayısı:', dbFixtures.length);
      return dbFixtures;
    }

    // API'den çek
    console.log('Fikstür API\'den çekiliyor');
    return await this.fetchFixtures();
  }

  /**
   * Belirli bir maçın fikstürünü getir
   */
  async getFixture(matchUuid) {
    // Cache kontrol
    const cacheKey = `fixture_${matchUuid}`;
    const cached = cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Veritabanı kontrol
    const dbFixture = db.getFixture(matchUuid);
    if (dbFixture) {
      cacheManager.set(cacheKey, dbFixture);
      return dbFixture;
    }

    // Tüm fikstürü güncelle
    await this.fetchFixtures();
    return db.getFixture(matchUuid);
  }
}

module.exports = new FixtureService();
