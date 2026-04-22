const express = require('express');
const matchStatsService = require('../services/matchStatsService');

const router = express.Router();

router.get('/fixture-with-stats/:fixtureUuid?', async (req, res) => {
  try {
    let { fixtureUuid } = req.params;
    if (!fixtureUuid) {
      fixtureUuid = '482ofyysbdbeoxauk19yg7tdt';
    }
    console.log('fixtureUuid', fixtureUuid);
    
    // API'den direkt çek (gameset yapısını korumak için)
    const apiClient = require('../utils/apiClient');
    const url = `https://www.sahadan.com/api/index/soccer-competition-${fixtureUuid}?a=bs&e=sac&competition_uuid=${fixtureUuid}&language=tr&country=tr&application=mackolik.com`;
    
    const data = await apiClient.get(url);
    
    const gamesetGroups = {};
    
    if (data && data.data && data.data.gamesets) {
      for (const gameset of data.data.gamesets) {
        const gamesetUuid = gameset.uuid || gameset.id || 'unknown';
        if (!gamesetGroups[gamesetUuid]) {
          gamesetGroups[gamesetUuid] = {
            gameset_uuid: gamesetUuid,
            gameset_name: gameset.name || gameset.title || '',
            matches: []
          };
        }
        
        if (gameset.matches && Array.isArray(gameset.matches)) {
          for (const match of gameset.matches) {
            const matchUuid = match.uuid || match.id;
            if (matchUuid) {
              // Maç istatistiklerini getir
              const matchStats = await matchStatsService.getMatchStats(matchUuid);
              
              gamesetGroups[gamesetUuid].matches.push({
                uuid: matchUuid,
                date: match.date_time_utc || match.date,
                home_team: match.team_A?.name || match.home_team,
                away_team: match.team_B?.name || match.away_team,
                home_score: match.fts_A,
                away_score: match.fts_B,
                status: match.status,
                stats: matchStats || null
              });
            }
          }
        }
      }
    }
    
    res.json({ success: true, data: gamesetGroups });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
