const https = require("https");
const fs = require("fs");
const path = require("path");

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" } }, (res) => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => { try { resolve(JSON.parse(d)); } catch (e) { reject(new Error("JSON: " + e.message)); } });
    }).on("error", reject);
  });
}

// Copy mappings and logic from server.js
const TEAM_IDS = {
  "Meksika": "1", "Güney Afrika": "2", "Güney Kore": "3", "Çekya": "4",
  "Kanada": "5", "Bosna-Hersek": "6", "Katar": "7", "İsviçre": "8",
  "Brezilya": "9", "Fas": "10", "Haiti": "11", "İskoçya": "12",
  "ABD": "13", "Paraguay": "14", "Avustralya": "15", "Türkiye": "16",
  "Almanya": "17", "Curaçao": "18", "Fildişi Sahili": "19", "Ekvador": "20",
  "Hollanda": "21", "Japonya": "22", "İsveç": "23", "Tunus": "24",
  "Belçika": "25", "Mısır": "26", "İran": "27", "Yeni Zelanda": "28",
  "İspanya": "29", "Yeşil Burun Adaları": "30", "Suudi Arabistan": "31", "Uruguay": "32",
  "Fransa": "33", "Senegal": "34", "Irak": "35", "Norveç": "36",
  "Arjantin": "37", "Cezayir": "38", "Avusturya": "39", "Ürdün": "40",
  "Portekiz": "41", "Demokratik Kongo Cumhuriyeti": "42", "Özbekistan": "43", "Kolombiya": "44",
  "İngiltere": "45", "Hırvatistan": "46", "Gana": "47", "Panama": "48",
  "Yeşil Burun": "30", "S. Arabistan": "31", "Demokratik Kongo C.": "42"
};

const TEAM_FLAGS = {
  "Meksika": "mx", "Güney Afrika": "za", "Güney Kore": "kr", "Çekya": "cz",
  "Kanada": "ca", "Bosna-Hersek": "ba", "Katar": "qa", "İsviçre": "ch",
  "Brezilya": "br", "Fas": "ma", "Haiti": "ht", "İskoçya": "gb-sct",
  "ABD": "us", "Paraguay": "py", "Avustralya": "au", "Türkiye": "tr",
  "Almanya": "de", "Curaçao": "cw", "Fildişi Sahili": "ci", "Ekvador": "ec",
  "Hollanda": "nl", "Japonya": "jp", "İsveç": "se", "Tunus": "tn",
  "Belçika": "be", "Mısır": "eg", "İran": "ir", "Yeni Zelanda": "nz",
  "İspanya": "es", "Yeşil Burun Adaları": "cv", "Suudi Arabistan": "sa", "Uruguay": "uy",
  "Fransa": "fr", "Senegal": "sn", "Irak": "iq", "Norveç": "no",
  "Arjantin": "ar", "Cezayir": "dz", "Avusturya": "at", "Ürdün": "jo",
  "Portekiz": "pt", "Demokratik Kongo Cumhuriyeti": "cd", "Özbekistan": "uz", "Kolombiya": "co",
  "İngiltere": "gb-eng", "Hırvatistan": "hr", "Gana": "gh", "Panama": "pa",
  "Yeşil Burun": "cv", "S. Arabistan": "sa", "Demokratik Kongo C.": "cd"
};

const TEAM_FIFA = {
  "Meksika": "MEX", "Güney Afrika": "RSA", "Güney Kore": "KOR", "Çekya": "CZE",
  "Kanada": "CAN", "Bosna-Hersek": "BIH", "Katar": "QAT", "İsviçre": "SUI",
  "Brezilya": "BRA", "Fas": "MAR", "Haiti": "HAI", "İskoçya": "SCO",
  "ABD": "USA", "Paraguay": "PAR", "Avustralya": "AUS", "Türkiye": "TUR",
  "Almanya": "GER", "Curaçao": "CUR", "Fildişi Sahili": "CIV", "Ekvador": "ECU",
  "Hollanda": "NED", "Japonya": "JPN", "İsveç": "SWE", "Tunus": "TUN",
  "Belçika": "BEL", "Mısır": "EGY", "İran": "IRN", "Yeni Zelanda": "NZL",
  "İspanya": "ESP", "Yeşil Burun Adaları": "CPV", "Suudi Arabistan": "KSA", "Uruguay": "URU",
  "Fransa": "FRA", "Senegal": "SEN", "Irak": "IRQ", "Norveç": "NOR",
  "Arjantin": "ARG", "Cezayir": "ALG", "Avusturya": "AUT", "Ürdün": "JOR",
  "Portekiz": "POR", "Demokratik Kongo Cumhuriyeti": "COD", "Özbekistan": "UZB", "Kolombiya": "COL",
  "İngiltere": "ENG", "Hırvatistan": "CRO", "Gana": "GHA", "Panama": "PAN",
  "Yeşil Burun": "CPV", "S. Arabistan": "KSA", "Demokratik Kongo C.": "COD"
};

const TR_TO_EN = {
  "Meksika": "Mexico", "Güney Afrika": "South Africa", "Güney Kore": "South Korea",
  "Çekya": "Czech Republic", "Kanada": "Canada", "Bosna-Hersek": "Bosnia and Herzegovina",
  "Katar": "Qatar", "İsviçre": "Switzerland", "Brezilya": "Brazil", "Fas": "Morocco",
  "Haiti": "Haiti", "İskoçya": "Scotland", "ABD": "United States", "Paraguay": "Paraguay",
  "Avustralya": "Australia", "Türkiye": "Turkey", "Almanya": "Germany", "Curaçao": "Curaçao",
  "Fildişi Sahili": "Ivory Coast", "Ekvador": "Ecuador", "Hollanda": "Netherlands",
  "Japonya": "Japan", "İsveç": "Sweden", "Tunus": "Tunisia", "Belçika": "Belgium",
  "Mısır": "Egypt", "İran": "Iran", "Yeni Zelanda": "New Zealand", "İspanya": "Spain",
  "Yeşil Burun Adaları": "Cape Verde", "Suudi Arabistan": "Saudi Arabia", "Uruguay": "Uruguay",
  "Fransa": "France", "Senegal": "Senegal", "Irak": "Iraq", "Norveç": "Norway",
  "Arjantin": "Argentina", "Cezayir": "Algeria", "Avusturya": "Austria", "Ürdün": "Jordan",
  "Portekiz": "Portugal", "Demokratik Kongo Cumhuriyeti": "Democratic Republic of the Congo",
  "Özbekistan": "Uzbekistan", "Kolombiya": "Colombia", "İngiltere": "England",
  "Hırvatistan": "Croatia", "Gana": "Ghana", "Panama": "Panama",
  "Yeşil Burun": "Cape Verde", "S. Arabistan": "Saudi Arabia", "Demokratik Kongo C.": "Democratic Republic of the Congo"
};

function flagUrl(n) { const c = TEAM_FLAGS[n]; return c ? `https://flagcdn.com/w80/${c}.png` : ""; }
function fifaCode(n) { return TEAM_FIFA[n] || ""; }
function enName(n) { return TR_TO_EN[n] || n; }
function teamId(name) { return TEAM_IDS[name] || name; }

function extractGroup(r) {
  const m = r.match(/Grup\s+([A-L])(?:\s|$)/);
  return m ? m[1] : "";
}

function cleanPlaceholderName(name) {
  if (!name) return name;
  let s = name.trim();
  s = s.replace(/Ç\.F\.?\s*([1-4])\.?\s*Eşleşme\s*Kazananı/i, "Ç.F. $1. Eşleşme Kazananı");
  s = s.replace(/Y\.?F\.?\s*([1-2])\.?\s*Eşleşme\s*Kazananı/i, "Y.F. $1. Eşleşme Kazananı");
  return s;
}

function transform(sahadanResp) {
  const data = sahadanResp.data;
  if (!data) return null;

  const teamsMap = {};
  const teams = [];

  function ensureTeam(rawName, uuid) {
    if (!rawName || !uuid) return null;
    const name = cleanPlaceholderName(rawName);
    if (teamsMap[uuid]) return teamsMap[uuid];
    const t = { id: teamId(name), name_tr: name, name_en: enName(name), flag: flagUrl(name), fifa_code: fifaCode(name), groups: "" };
    teamsMap[uuid] = t;
    teams.push(t);
    return t;
  }

  const groups = [];
  const groupsMap = {};

  const rankingsSource = (data.rankings_live && data.rankings_live.total) ? data.rankings_live.total : (data.rankings && data.rankings.total ? data.rankings.total : null);
  if (rankingsSource) {
    for (const gr of rankingsSource) {
      const gn = extractGroup(gr.group?.name || gr.name || "");
      if (!gn) continue;
      const g = { name: gn, teams: [] };
      if (gr.table) {
        for (const e of gr.table) {
          const to = e.team;
          if (!to) continue;
          const t = ensureTeam(to.name, to.uuid);
          if (!t) continue;
          if (t.groups.indexOf(gn) === -1) t.groups = t.groups ? t.groups + "," + gn : gn;
          g.teams.push({
            team_id: teamId(to.name), name_tr: to.name, name_en: enName(to.name), flag: flagUrl(to.name), fifa_code: fifaCode(to.name),
            mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0
          });
        }
      }
      groups.push(g);
      groupsMap[gn] = g;
    }
  }

  const games = [];
  if (data.gamesets) {
    for (const gs of data.gamesets) {
      const md = gs.name;
      for (const m of gs.matches) {
        const a = m.team_A, b = m.team_B;
        if (!a || !b) continue;
        ensureTeam(a.name, a.uuid);
        ensureTeam(b.name, b.uuid);
        const rn = m.round?.name || "";
        const type = "group";
        
        let gl = extractGroup(rn);
        if (!gl && (type === "group" || md === "1" || md === "2" || md === "3")) {
          if (a && a.uuid && teamsMap[a.uuid]) {
            gl = (teamsMap[a.uuid].groups || "").split(",")[0] || "";
          }
        }
        if (!gl) gl = "";

        const finished = m.status === "Played";

        // Safe score parsing
        let hs = null;
        if (m.fts_A !== undefined && m.fts_A !== null) {
          hs = parseInt(m.fts_A);
        } else if (m.score_A !== undefined && m.score_A !== null && m.score_A !== "-") {
          hs = parseInt(m.score_A);
        }
        if (isNaN(hs)) hs = null;

        let as = null;
        if (m.fts_B !== undefined && m.fts_B !== null) {
          as = parseInt(m.fts_B);
        } else if (m.score_B !== undefined && m.score_B !== null && m.score_B !== "-") {
          as = parseInt(m.score_B);
        }
        if (isNaN(as)) as = null;

        const homeId = cleanPlaceholderName(teamId(a.name));
        const awayId = cleanPlaceholderName(teamId(b.name));

        const game = {
          home_team_id: homeId, away_team_id: awayId,
          home_team_name_tr: cleanPlaceholderName(a.name), away_team_name_tr: cleanPlaceholderName(b.name),
          home_score: hs, away_score: as,
          group: gl, finished, type
        };
        games.push(game);
      }
    }
  }

  calculateAllStandings(groups, games);
  return { groups, games };
}

function calculateAllStandings(groups, games) {
  if (!groups || !games) return;
  
  for (const game of games) {
    if (game.type !== "group") continue;
    if (game.home_score === null || game.away_score === null) continue;
    
    const group = groups.find(g => g.name === game.group);
    if (!group) continue;
    
    const homeTeam = group.teams.find(t => t.team_id === game.home_team_id);
    const awayTeam = group.teams.find(t => t.team_id === game.away_team_id);
    
    if (homeTeam && awayTeam) {
      const hs = game.home_score;
      const as = game.away_score;
      
      console.log(`Processing game: ${game.home_team_name_tr} (${game.home_team_id}) vs ${game.away_team_name_tr} (${game.away_team_id}), group=${game.group}, score=${hs}-${as}`);

      homeTeam.mp += 1;
      awayTeam.mp += 1;
      homeTeam.gf += hs;
      awayTeam.gf += as;
      homeTeam.ga += as;
      awayTeam.ga += hs;
      homeTeam.gd = homeTeam.gf - homeTeam.ga;
      awayTeam.gd = awayTeam.gf - awayTeam.ga;
      
      if (hs > as) {
        homeTeam.w += 1;
        awayTeam.l += 1;
        homeTeam.pts += 3;
      } else if (as > hs) {
        awayTeam.w += 1;
        homeTeam.l += 1;
        awayTeam.pts += 3;
      } else {
        homeTeam.d += 1;
        awayTeam.d += 1;
        homeTeam.pts += 1;
        awayTeam.pts += 1;
      }
    } else {
      console.log(`Skipped game: ${game.home_team_name_tr} (${game.home_team_id}) vs ${game.away_team_name_tr} (${game.away_team_id}), group=${game.group}, homeFound=${!!homeTeam}, awayFound=${!!awayTeam}`);
    }
  }
}

fetchJson("https://www.sahadan.com/api/index/soccer-competition-70excpe1synn9kadnbppahdn7?a=bs&e=sac&competition_uuid=70excpe1synn9kadnbppahdn7&language=tr&country=tr&application=mackolik.com")
  .then(resp => {
    const { groups } = transform(resp);
    console.log("--- Group B Standings ---");
    const groupB = groups.find(g => g.name === "B");
    if (groupB) {
      groupB.teams.forEach(t => {
        console.log(`  ${t.name_tr} (${t.team_id}): MP=${t.mp}, PTS=${t.pts}, W=${t.w}, D=${t.d}, L=${t.l}, GF=${t.gf}, GA=${t.ga}`);
      });
    }
  })
  .catch(console.error);
