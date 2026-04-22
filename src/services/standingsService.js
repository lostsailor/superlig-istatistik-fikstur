const apiClient = require('../utils/apiClient');
const cacheManager = require('../cache/cacheManager');
const db = require('../database/db');

class StandingsService {
  constructor() {
    this.baseUrl = 'https://www.sahadan.com/lig/trendyol-super-lig/482ofyysbdbeoxauk19yg7tdt';
    this.apiEndpoint = 'https://www.sahadan.com/api/index/country-area-6kd6webenogylfgwt2aa9l6vx';
  }

  /**
   * Puan durumunu API'den al
   */
  async fetchStandings() {
    try {
      const data = await apiClient.get(this.apiEndpoint);
      
      // API yanıtından lig bilgilerini çıkar
      let standings = [];
      if (data && data.data && data.data.standings) {
        standings = this.parseStandings(data.data.standings);
      } else if (data && data.standings) {
        standings = this.parseStandings(data.standings);
      }

      if (standings.length > 0) {
        // Cache'e kaydet
        cacheManager.set('standings', standings);
        
        // Veritabanına kaydet
        db.saveStandings(standings);
      }

      return standings;
    } catch (error) {
      console.error('Puan durumu çekme hatası:', error);
      throw error;
    }
  }

  /**
   * Puan durumunu parse et
   */
  parseStandings(rawStandings) {
    const standingsMap = new Map();

    // Farklı formatları destekle
    const standings = Array.isArray(rawStandings) ? rawStandings : (rawStandings.teams || []);

    for (const team of standings) {
      const standing = {
        team_name: team.team_name || team.name || team.teamName || '',
        position: team.position || team.rank || team.pos || 0,
        played: team.played || team.matches || team.played_count || 0,
        won: team.won || team.wins || team.win || 0,
        drawn: team.drawn || team.draws || team.draw || 0,
        lost: team.lost || team.losses || team.loss || 0,
        goals_for: team.goals_for || team.goalsFor || team.gf || 0,
        goals_against: team.goals_against || team.goalsAgainst || team.ga || 0,
        goal_difference: team.goal_difference || team.goalDifference || team.gd || 0,
        points: team.points || team.pts || 0
      };

      if (standing.team_name) {
        standingsMap.set(standing.team_name, standing);
      }
    }

    return Array.from(standingsMap.values()).sort((a, b) => a.position - b.position);
  }

  /**
   * Puan durumunu getir (önce cache, sonra veritabanı, sonra API)
   */
  async getStandings() {
    // Cache kontrol
    const cached = cacheManager.get('standings');
    if (cached) {
      return cached;
    }

    // Veritabanı kontrol
    const dbStandings = db.getStandings();
    if (dbStandings && dbStandings.length > 0) {
      return dbStandings;
    }

    // API'den çek
    return await this.fetchStandings();
  }

  /**
   * Puan durumunu güncelle (cron job için)
   */
  async updateStandings() {
    console.log('Puan durumu güncelleniyor...');
    try {
      await this.fetchStandings();
      console.log('Puan durumu güncellendi');
    } catch (error) {
      console.error('Puan durumu güncelleme hatası:', error);
    }
  }
}

module.exports = new StandingsService();
