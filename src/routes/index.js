const express = require('express');
const fixtureService = require('../services/fixtureService');
const standingsService = require('../services/standingsService');
const matchStatsService = require('../services/matchStatsService');

const router = express.Router();

/**
 * Fikstür endpoint'leri
 */
router.get('/fixtures', async (req, res) => {
  try {
    const { competition_uuid } = req.query;
    const fixtures = await fixtureService.getFixtures(competition_uuid);
    res.json({ success: true, data: fixtures });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/fixtures/competition/:competitionUuid', async (req, res) => {
  try {
    const { competitionUuid } = req.params;
    const fixtures = await fixtureService.getFixtures(competitionUuid);
    res.json({ success: true, data: fixtures });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/fixtures/:matchUuid', async (req, res) => {
  try {
    const { matchUuid } = req.params;
    const fixture = await fixtureService.getFixture(matchUuid);
    if (fixture) {
      res.json({ success: true, data: fixture });
    } else {
      res.status(404).json({ success: false, error: 'Fikstür bulunamadı' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Puan durumu endpoint'leri
 */
router.get('/standings', async (req, res) => {
  try {
    const standings = await standingsService.getStandings();
    res.json({ success: true, data: standings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Maç istatistikleri endpoint'leri
 */
router.get('/match-stats/:matchUuid', async (req, res) => {
  try {
    const { matchUuid } = req.params;
    const stats = await matchStatsService.getMatchStats(matchUuid);
    if (stats) {
      // Çevrilen veriyi döndür
      const response = {
        ...stats,
        stat_team_detailed: stats.stat_team_detailed_tr || stats.stat_team_detailed
      };
      delete response.stat_team_detailed_tr;
      res.json({ success: true, data: response });
    } else {
      res.status(404).json({ success: false, error: 'Maç istatistikleri bulunamadı' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/match-stats/date/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const stats = await matchStatsService.getMatchStatsByDate(date);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Geçmiş veri tamamlama tetikleme endpoint'i
 */
router.post('/backfill', async (req, res) => {
  try {
    // Asenkron olarak başlat
    matchStatsService.backfillHistoricalData();
    res.json({ success: true, message: 'Geçmiş veri tamamlama başlatıldı' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/fixture-with-stats/:fixtureUuid', async (req, res) => {
  try {
    let { fixtureUuid } = req.params;
    if (!fixtureUuid) {
      fixtureUuid = '482ofyysbdbeoxauk19yg7tdt';
    }
    console.log('fixtureUuid', fixtureUuid);
    const fixture = await fixtureService.getFixtureByUuid(fixtureUuid);
    for (const key in fixture) {
      console.log(key, fixture[key]);
    }
    res.json({ success: true, data: fixture });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


module.exports = router;
