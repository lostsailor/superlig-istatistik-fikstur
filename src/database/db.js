const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../../data/superlig.db');

class DatabaseManager {
  constructor() {
    this.db = null;
    this.SQL = null;
  }

  async connect() {
    this.SQL = await initSqlJs();
    
    // Dosyayı oku veya yeni oluştur
    let dbBuffer = null;
    if (fs.existsSync(dbPath)) {
      dbBuffer = fs.readFileSync(dbPath);
    }
    
    this.db = new this.SQL.Database(dbBuffer);
    this.initTables();
    this.save();
  }

  initTables() {
    // Puan durumu tablosu
    this.db.run(`
      CREATE TABLE IF NOT EXISTS standings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_name TEXT NOT NULL,
        position INTEGER,
        played INTEGER,
        won INTEGER,
        drawn INTEGER,
        lost INTEGER,
        goals_for INTEGER,
        goals_against INTEGER,
        goal_difference INTEGER,
        points INTEGER,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Maç istatistikleri tablosu
    this.db.run(`
      CREATE TABLE IF NOT EXISTS match_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        match_uuid TEXT UNIQUE NOT NULL,
        match_date TEXT NOT NULL,
        home_team TEXT NOT NULL,
        away_team TEXT NOT NULL,
        stat_team_detailed TEXT NOT NULL,
        stat_team_detailed_tr TEXT,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Fikstür tablosu
    this.db.run(`
      CREATE TABLE IF NOT EXISTS fixtures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        match_uuid TEXT UNIQUE NOT NULL,
        match_date TEXT NOT NULL,
        home_team TEXT NOT NULL,
        away_team TEXT NOT NULL,
        fixture_data TEXT NOT NULL,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Indexler
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_match_stats_uuid ON match_stats(match_uuid)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_match_stats_date ON match_stats(match_date)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_fixtures_uuid ON fixtures(match_uuid)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_fixtures_date ON fixtures(match_date)`);
  }

  save() {
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }

  // Puan durumu işlemleri
  saveStandings(standings) {
    // Önce mevcut kayıtları sil
    this.db.run('DELETE FROM standings');
    
    const stmt = this.db.prepare(`
      INSERT INTO standings 
      (team_name, position, played, won, drawn, lost, goals_for, goals_against, goal_difference, points, last_updated)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const team of standings) {
      stmt.run(
        team.team_name,
        team.position,
        team.played,
        team.won,
        team.drawn,
        team.lost,
        team.goals_for,
        team.goals_against,
        team.goal_difference,
        team.points,
        new Date().toISOString()
      );
    }
    
    this.save();
  }

  getStandings() {
    const stmt = this.db.prepare('SELECT * FROM standings ORDER BY position ASC');
    stmt.bind();
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  }

  // Maç istatistikleri işlemleri
  saveMatchStats(matchUuid, matchDate, homeTeam, awayTeam, statTeamDetailed, statTeamDetailedTr) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO match_stats 
      (match_uuid, match_date, home_team, away_team, stat_team_detailed, stat_team_detailed_tr, last_updated)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.bind([matchUuid, matchDate, homeTeam, awayTeam, JSON.stringify(statTeamDetailed), JSON.stringify(statTeamDetailedTr), new Date().toISOString()]);
    stmt.step();
    stmt.free();

    this.save();
  }

  getMatchStats(matchUuid) {
    const stmt = this.db.prepare('SELECT * FROM match_stats WHERE match_uuid = ?');
    stmt.bind([matchUuid]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return {
        ...row,
        stat_team_detailed: JSON.parse(row.stat_team_detailed),
        stat_team_detailed_tr: row.stat_team_detailed_tr ? JSON.parse(row.stat_team_detailed_tr) : null
      };
    }
    stmt.free();
    return null;
  }

  getMatchStatsByDate(date) {
    const stmt = this.db.prepare('SELECT * FROM match_stats WHERE match_date = ?');
    stmt.bind([date]);
    const results = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push({
        ...row,
        stat_team_detailed: JSON.parse(row.stat_team_detailed),
        stat_team_detailed_tr: row.stat_team_detailed_tr ? JSON.parse(row.stat_team_detailed_tr) : null
      });
    }
    stmt.free();
    return results;
  }

  // Fikstür işlemleri
  saveFixture(matchUuid, matchDate, homeTeam, awayTeam, fixtureData) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO fixtures 
      (match_uuid, match_date, home_team, away_team, fixture_data, last_updated)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.bind([matchUuid, matchDate, homeTeam, awayTeam, JSON.stringify(fixtureData), new Date().toISOString()]);
    stmt.step();
    stmt.free();
    
    this.save();
  }

  getFixture(matchUuid) {
    const stmt = this.db.prepare('SELECT * FROM fixtures WHERE match_uuid = ?');
    stmt.bind([matchUuid]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return {
        ...row,
        fixture_data: JSON.parse(row.fixture_data)
      };
    }
    stmt.free();
    return null;
  }

  getAllFixtures() {
    const stmt = this.db.prepare('SELECT * FROM fixtures ORDER BY match_date ASC');
    stmt.bind();
    const results = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push({
        ...row,
        fixture_data: JSON.parse(row.fixture_data)
      });
    }
    stmt.free();
    return results;
  }

  close() {
    if (this.db) {
      this.save();
      this.db.close();
    }
  }
}

module.exports = new DatabaseManager();
