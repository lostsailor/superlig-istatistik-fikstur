const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
const CACHE_FILE = path.join(__dirname, "data", "cache.json");
const STADIUM_MAPPINGS_FILE = path.join(__dirname, "data", "stadium_mappings.json");
let stadiumMappings = {};
try {
  if (fs.existsSync(STADIUM_MAPPINGS_FILE)) {
    stadiumMappings = JSON.parse(fs.readFileSync(STADIUM_MAPPINGS_FILE, "utf8"));
  }
} catch (e) {
  console.error("Stadium mappings load error:", e.message);
}

const TR_NAMES = {
  "South Africa": "Güney Afrika", "Brazil": "Brezilya", "Scotland": "İskoçya", "Turkey": "Türkiye",
  "Ivory Coast": "Fildişi Sahili", "Netherlands": "Hollanda", "Cape Verde": "Yeşil Burun Adaları",
  "France": "Fransa", "Tunisia": "Tunus", "Egypt": "Mısır", "Iraq": "Irak", "Portugal": "Portekiz",
  "Uzbekistan": "Özbekistan", "Colombia": "Kolombiya", "Ecuador": "Ekvador", "Japan": "Japonya",
  "New Zealand": "Yeni Zelanda", "Saudi Arabia": "Suudi Arabistan", "Austria": "Avusturya",
  "Ghana": "Gana", "South Korea": "Güney Kore", "Spain": "İspanya", "Norway": "Norveç",
  "Argentina": "Arjantin", "Democratic Republic of the Congo": "Demokratik Kongo Cumhuriyeti",
  "England": "İngiltere", "Czech Republic": "Çekya", "Canada": "Kanada", "Qatar": "Katar",
  "Switzerland": "İsviçre", "Morocco": "Fas", "Paraguay": "Paraguay", "Curaçao": "Curaçao",
  "Sweden": "İsveç", "Algeria": "Cezayir", "Jordan": "Ürdün", "Haiti": "Haiti", "Germany": "Almanya",
  "Uruguay": "Uruguay", "Senegal": "Senegal", "Panama": "Panama", "Mexico": "Meksika",
  "Bosnia and Herzegovina": "Bosna-Hersek", "United States": "ABD", "Australia": "Avustralya",
  "Iran": "İran", "Belgium": "Belçika", "Croatia": "Hırvatistan"
};

const MIME_TYPES = {
  ".html": "text/html", ".css": "text/css", ".js": "text/javascript",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpg",
  ".gif": "image/gif", ".svg": "image/svg+xml"
};

const ALLOWED_STATS = new Set([
  "Topla Oynama", "Gol Beklentisi (xG)", "İsabetli Şut", "Toplam Şut",
  "Rakip Ceza Sahasında Topla Buluşma (RCS)", "Korner", "Ofsayt", "Taç Atışı",
  "Faul", "Sarı Kart", "İkinci Sarıdan Kırmızı Kart", "Direkt Kırmızı Kart",
  "Toplam Pas", "İsabetli Pas", "Toplam Orta", "İsabetli Orta", "Uzaklaştırma"
]);

const STAT_MAPPING = {
  // Turkish keys
  "Topla oynama": "Topla Oynama",
  "Beklenen gol": "Gol Beklentisi (xG)",
  "İsabetli şut": "İsabetli Şut",
  "Şut": "Toplam Şut",
  "Rakip ceza sahası dokunma": "Rakip Ceza Sahasında Topla Buluşma (RCS)",
  "Korner": "Korner",
  "Toplam ofsayt": "Ofsayt",
  "Taç atışı": "Taç Atışı",
  "Taç Atışı": "Taç Atışı",
  "Faul": "Faul",
  "Sarı kart": "Sarı Kart",
  "İkinci sarı kart": "İkinci Sarıdan Kırmızı Kart",
  "Doğrudan kırmızı kart": "Direkt Kırmızı Kart",
  "Pas": "Toplam Pas",
  "Başarılı pas": "İsabetli Pas",
  "Orta": "Toplam Orta",
  "Başarılı orta": "İsabetli Orta",
  "Topu uzaklaştırma": "Uzaklaştırma",

  // English keys (for live matches)
  "possession": "Topla Oynama",
  "expected_goals": "Gol Beklentisi (xG)",
  "shots_on_target": "İsabetli Şut",
  "shots": "Toplam Şut",
  "touches_in_opp_box": "Rakip Ceza Sahasında Topla Buluşma (RCS)",
  "corners": "Korner",
  "total_offside": "Ofsayt",
  "throw_in": "Taç Atışı",
  "fouls": "Faul",
  "yellow_card": "Sarı Kart",
  "second_yellow_card": "İkinci Sarıdan Kırmızı Kart",
  "direct_red_card": "Direkt Kırmızı Kart",
  "passes": "Toplam Pas",
  "successful_passes": "İsabetli Pas",
  "crosses": "Toplam Orta",
  "successful_crosses": "İsabetli Orta",
  "clearances": "Uzaklaştırma"
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

const STADIUM_OFFSETS = {
  "1": -6, "2": -6, "3": -6, "4": -5, "5": -5, "6": -5, "7": -4, "8": -4,
  "9": -4, "10": -4, "11": -4, "12": -4, "13": -7, "14": -7, "15": -7, "16": -7
};

const STADIUM_NAMES_TR = {
  "1": "Estadio Azteca", "2": "Estadio Akron", "3": "Estadio BBVA",
  "4": "AT&T Stadyumu", "5": "NRG Stadyumu", "6": "Arrowhead Stadyumu",
  "7": "Mercedes-Benz Stadyumu", "8": "Hard Rock Stadyumu", "9": "Gillette Stadyumu",
  "10": "Lincoln Financial Field", "11": "MetLife Stadyumu", "12": "BMO Field",
  "13": "BC Place", "14": "Lumen Field", "15": "Levi's Stadyumu", "16": "SoFi Stadyumu"
};

const STADIUM_CITIES_TR = {
  "1": "Meksiko", "2": "Guadalajara", "3": "Monterrey",
  "4": "Dallas", "5": "Houston", "6": "Kansas City",
  "7": "Atlanta", "8": "Miami", "9": "Boston",
  "10": "Philadelphia", "11": "New York / New Jersey", "12": "Toronto",
  "13": "Vancouver", "14": "Seattle", "15": "San Francisco", "16": "Los Angeles"
};

const STADIUM_COUNTRIES_TR = {
  "1": "Meksika", "2": "Meksika", "3": "Meksika",
  "4": "ABD", "5": "ABD", "6": "ABD", "7": "ABD", "8": "ABD",
  "9": "ABD", "10": "ABD", "11": "ABD",
  "12": "Kanada", "13": "Kanada", "14": "ABD", "15": "ABD", "16": "ABD"
};

const STADIUM_DETAILS = [
  { id: "1", name_en: "Estadio Azteca", city_en: "Mexico City", country_en: "Mexico", capacity: 83000, region: "Central" },
  { id: "2", name_en: "Estadio Akron", city_en: "Guadalajara (Zapopan)", country_en: "Mexico", capacity: 48000, region: "Central" },
  { id: "3", name_en: "Estadio BBVA", city_en: "Monterrey (Guadalupe)", country_en: "Mexico", capacity: 53500, region: "Central" },
  { id: "4", name_en: "AT&T Stadium", city_en: "Dallas (Arlington, Texas)", country_en: "United States", capacity: 80000, region: "Central" },
  { id: "5", name_en: "NRG Stadium", city_en: "Houston", country_en: "United States", capacity: 72000, region: "Central" },
  { id: "6", name_en: "GEHA Field at Arrowhead Stadium", city_en: "Kansas City", country_en: "United States", capacity: 76500, region: "Central" },
  { id: "7", name_en: "Mercedes-Benz Stadium", city_en: "Atlanta", country_en: "United States", capacity: 71000, region: "Eastern" },
  { id: "8", name_en: "Hard Rock Stadium", city_en: "Miami (Miami Gardens)", country_en: "United States", capacity: 65000, region: "Eastern" },
  { id: "9", name_en: "Gillette Stadium", city_en: "Boston (Foxborough)", country_en: "United States", capacity: 65800, region: "Eastern" },
  { id: "10", name_en: "Lincoln Financial Field", city_en: "Philadelphia", country_en: "United States", capacity: 69500, region: "Eastern" },
  { id: "11", name_en: "MetLife Stadium", city_en: "New York/New Jersey (East Rutherford)", country_en: "United States", capacity: 82500, region: "Eastern" },
  { id: "12", name_en: "BMO Field", city_en: "Toronto", country_en: "Canada", capacity: 45000, region: "Eastern" },
  { id: "13", name_en: "BC Place", city_en: "Vancouver", country_en: "Canada", capacity: 54000, region: "Western" },
  { id: "14", name_en: "Lumen Field", city_en: "Seattle", country_en: "United States", capacity: 69000, region: "Western" },
  { id: "15", name_en: "Levi's Stadium", city_en: "San Francisco Bay Area (Santa Clara)", country_en: "United States", capacity: 68500, region: "Western" },
  { id: "16", name_en: "SoFi Stadium", city_en: "Los Angeles (Inglewood)", country_en: "United States", capacity: 70000, region: "Western" }
];

const VENUE_MAP = {
  "Mexico City Stadium": "1", "Estadio Azteca": "1",
  "Estadio Guadalajara": "2", "Estadio Akron": "2", "Guadalajara Stadium": "2",
  "Monterrey Stadium": "3", "Estadio BBVA": "3",
  "AT&T Stadium": "4", "Dallas Stadium": "4",
  "NRG Stadium": "5", "Houston Stadium": "5",
  "Arrowhead Stadium": "6", "GEHA Field at Arrowhead Stadium": "6", "Kansas City Stadium": "6",
  "Mercedes-Benz Stadium": "7", "Atlanta Stadium": "7",
  "Hard Rock Stadium": "8", "Miami Stadium": "8",
  "Gillette Stadium": "9", "Boston Stadium": "9",
  "Lincoln Financial Field": "10", "Philadelphia Stadium": "10",
  "MetLife Stadium": "11", "New York/New Jersey Stadium": "11", "New York New Jersey Stadium": "11",
  "BMO Field": "12", "Toronto Stadium": "12",
  "BC Place": "13", "BC Place Vancouver": "13", "Vancouver Stadium": "13",
  "Lumen Field": "14", "Seattle Stadium": "14",
  "Levi's Stadium": "15", "Levi's® Stadium": "15", "San Francisco Stadium": "15", "Santa Clara Stadium": "15",
  "SoFi Stadium": "16", "Los Angeles Stadium": "16"
};

const GROUP_NAMES = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
const TR_COUNTRIES = { "United States": "ABD", "Mexico": "Meksika", "Canada": "Kanada" };
const TR_CITIES = {
  "Seattle": "Seattle", "Miami (Miami Gardens)": "Miami", "Vancouver": "Vancouver",
  "San Francisco Bay Area (Santa Clara)": "San Francisco", "Monterrey (Guadalupe)": "Monterrey",
  "Mexico City": "Meksiko", "Guadalajara (Zapopan)": "Guadalajara", "Houston": "Houston",
  "Los Angeles (Inglewood)": "Los Angeles", "Atlanta": "Atlanta", "Boston (Foxborough)": "Boston",
  "Kansas City": "Kansas City", "Philadelphia": "Philadelphia", "Dallas (Arlington, Texas)": "Dallas",
  "New York/New Jersey (East Rutherford)": "New York / New Jersey", "Toronto": "Toronto"
};

let cachedData = null;
let matchDetailsCache = {};

function flagUrl(n) { const c = TEAM_FLAGS[n]; return c ? `https://flagcdn.com/w80/${c}.png` : ""; }
function fifaCode(n) { return TEAM_FIFA[n] || ""; }
function enName(n) { return TR_TO_EN[n] || n; }

function extractGroup(r) {
  const m = r.match(/Grup\s+([A-L])(?:\s|$)/);
  return m ? m[1] : "";
}

function cleanPlaceholderName(name) {
  if (!name) return name;
  let s = name.trim();
  // Standardize "Ç.F. X. Eşleşme Kazananı"
  s = s.replace(/Ç\.F\.?\s*([1-4])\.?\s*Eşleşme\s*Kazananı/i, "Ç.F. $1. Eşleşme Kazananı");
  // Standardize "Y.F. X. Eşleşme Kazananı"
  s = s.replace(/Y\.?F\.?\s*([1-2])\.?\s*Eşleşme\s*Kazananı/i, "Y.F. $1. Eşleşme Kazananı");
  return s;
}

function toTurkeyTime(s) {
  try {
    const d = new Date(s.replace(" ", "T") + "Z");
    const t = new Date(d.getTime() + 3 * 3600000);
    const p = n => String(n).padStart(2, "0");
    return `${p(t.getUTCMonth() + 1)}/${p(t.getUTCDate())}/${t.getUTCFullYear()} ${p(t.getUTCHours())}:${p(t.getUTCMinutes())}`;
  } catch { return s; }
}

function filterStats(statData) {
  if (!statData) return null;
  const out = {};
  if (statData.a && Array.isArray(statData.a)) {
    const f = statData.a
      .map(s => {
        const mappedType = STAT_MAPPING[s.type] || s.type;
        return {
          type: mappedType,
          team_A_value: s.team_A_value,
          team_B_value: s.team_B_value
        };
      })
      .filter(s => ALLOWED_STATS.has(s.type));
    if (f.length) out.a = f;
  }
  return Object.keys(out).length ? out : null;
}

function extractScorers(events, side) {
  if (!events || !Array.isArray(events)) return null;
  const g = events.filter(e => e.type === "G" && e.team === side);
  if (!g.length) return null;
  const parts = g.map(e => {
    let l = e.scorer?.name || "";
    if (e.minute) l += ` ${e.minute}'`;
    if (e.extra_minute) l += `+${e.extra_minute}'`;
    return l;
  });
  return "{" + parts.map(p => `"${p}"`).join(",") + "}";
}

function cleanPlayer(p) {
  if (!p) return null;
  const o = {};
  const sub = p.player || p;
  for (const k of Object.keys(sub)) {
    if (k.indexOf("name") !== -1) o[k] = sub[k] || "";
  }
  o.number = p.number !== undefined ? p.number : null;
  o.position = p.position || "";
  return o;
}

function cleanLineup(ld) {
  if (!ld) return null;
  const out = {};
  for (const side of ["team_A", "team_B"]) {
    if (ld[side]) {
      const t = ld[side];
      const o = {};
      if (t.formation) o.formation = t.formation;
      if (t.players && Array.isArray(t.players))
        o.players = t.players.map(cleanPlayer);
      if (t.substitutes && Array.isArray(t.substitutes))
        o.substitutes = t.substitutes.map(cleanPlayer);
      out[side] = o;
    }
  }
  return out;
}



function applyStadium(game, venueName) {
  if (!venueName) return;
  const sid = VENUE_MAP[venueName];
  if (sid) {
    game.stadium_id = sid;
    game.stadium_name_tr = STADIUM_NAMES_TR[sid];
    game.stadium_city_tr = STADIUM_CITIES_TR[sid];
    game.stadium_country_tr = STADIUM_COUNTRIES_TR[sid];
  }
}

function enrichGame(game) {
  const dd = matchDetailsCache[game.id];
  game.home_team_label = fifaCode(game.home_team_name_tr);
  game.away_team_label = fifaCode(game.away_team_name_tr);
  
  // 1. Try to apply stadium from the local static mapping database first
  const key = `${game.home_team_id}_${game.away_team_id}`;
  const sid = stadiumMappings[key];
  if (sid) {
    game.stadium_id = sid;
    game.stadium_name_tr = STADIUM_NAMES_TR[sid];
    game.stadium_city_tr = STADIUM_CITIES_TR[sid];
    game.stadium_country_tr = STADIUM_COUNTRIES_TR[sid];
  }

  // 2. If details are loaded, let them enrich lineup/events/stats
  if (!dd) return;
  if (dd.match?.venue?.name) applyStadium(game, dd.match.venue.name);
  if (dd.lineup) game.lineup = cleanLineup(dd.lineup);
  if (dd.stat_team_detailed) {
    if (dd.stat_team_detailed.a) {
      game.stat_team_detailed = filterStats(dd.stat_team_detailed);
    } else {
      game.stat_team_detailed = { a: dd.stat_team_detailed };
    }
  }
  if (dd.events) {
    game.events = dd.events.filter(e => e.type === "YC" || e.type === "Y2" || e.type === "RC");
  }
}

function enrichGames() {
  if (!cachedData?.games) return;
  for (const g of cachedData.games) enrichGame(g);
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Accept": "application/json" } }, (res) => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => { try { resolve(JSON.parse(d)); } catch (e) { reject(new Error("JSON: " + e.message)); } });
    }).on("error", reject);
  });
}

async function fetchMatchDetail(uuid, isLive = false) {
  const localFile = path.join(__dirname, "data", `match_detail_${uuid}.json`);
  
  // 1. If not live, try local file first
  if (!isLive) {
    try {
      if (fs.existsSync(localFile)) {
        const raw = fs.readFileSync(localFile, "utf8");
        const r = JSON.parse(raw);
        if (r) {
          const d = r.data || r;
          return {
            lineup: cleanLineup(d.lineup),
            stat_team_detailed: filterStats(d.stat_team_detailed),
            events: d.events || null,
            match: d.match || null
          };
        }
      }
    } catch (err) {
      console.error(`Local match detail load error (${uuid}):`, err.message);
    }
  }

  // 2. Fetch from network
  try {
    const r = await fetchJson(`https://www.sahadan.com/api/index/match-detail-${uuid}?application=com.kokteyl.mackolik&language=tr&country=tr&e=sam&match_uuid=${uuid}&a=bs`);
    if (r && r.data) {
      try {
        fs.writeFileSync(localFile, JSON.stringify(r.data, null, 2), "utf8");
        console.log(`Saved match detail locally: ${uuid}`);
      } catch (err) {
        console.error(`Failed to save match detail locally (${uuid}):`, err.message);
      }
      return {
        lineup: cleanLineup(r.data.lineup),
        stat_team_detailed: filterStats(r.data.stat_team_detailed),
        events: r.data.events || null,
        match: r.data.match || null
      };
    }
  } catch { }

  // 3. Fallback to local file if network fetch fails during live match
  if (isLive) {
    try {
      if (fs.existsSync(localFile)) {
        const raw = fs.readFileSync(localFile, "utf8");
        const r = JSON.parse(raw);
        if (r) {
          const d = r.data || r;
          return {
            lineup: cleanLineup(d.lineup),
            stat_team_detailed: filterStats(d.stat_team_detailed),
            events: d.events || null,
            match: d.match || null
          };
        }
      }
    } catch (err) { }
  }

  return null;
}

function fetchCompetition() {
  return fetchJson("https://www.sahadan.com/api/index/soccer-competition-70excpe1synn9kadnbppahdn7?a=bs&e=sac&competition_uuid=70excpe1synn9kadnbppahdn7&language=tr&country=tr&application=mackolik.com");
}

function fetchWorldCupGames() {
  return new Promise((resolve) => {
    https.get("https://worldcup26.ir/get/games", { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => {
        try { resolve(JSON.parse(d)); } catch { resolve(null); }
      });
    }).on("error", () => resolve(null));
  });
}

function saveCache() {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ competition: cachedData, matchDetails: matchDetailsCache }), "utf8");
    
    // Also update data.js static fallback file
    const dataJsFile = path.join(__dirname, "data.js");
    fs.writeFileSync(dataJsFile, `// FIFA World Cup 2026 Static Fallback Data\nconst WORLD_CUP_2026_DATA = ${JSON.stringify(cachedData, null, 2)};\n`, "utf8");
    console.log("data.js static fallback dosyası güncellendi.");
  } catch (e) { console.error("Cache yazma hatası:", e.message); }
}

function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, "utf8");
      const d = JSON.parse(raw);
      if (d.competition) cachedData = d.competition;
      if (d.matchDetails) matchDetailsCache = d.matchDetails;
      if (cachedData) {
        enrichGames();
        console.log(`Cache'den yüklendi: ${cachedData.games?.length || 0} maç`);
        
        // Also update data.js static fallback file on startup
        const dataJsFile = path.join(__dirname, "data.js");
        fs.writeFileSync(dataJsFile, `// FIFA World Cup 2026 Static Fallback Data\nconst WORLD_CUP_2026_DATA = ${JSON.stringify(cachedData, null, 2)};\n`, "utf8");
        console.log("data.js static fallback dosyası yüklendi ve güncellendi.");
      }
      return !!cachedData;
    }
  } catch (e) { console.error("Cache okuma hatası:", e.message); }
  return false;
}

function transform(sahadanResp, wcGames = null) {
  const data = sahadanResp?.data || {};

  const teamsMap = {};
  const teams = [];

  function teamId(name) { return TEAM_IDS[name] || name; }
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
  for (const gn of GROUP_NAMES) { 
    const g = { name: gn, teams: [] };
    groups.push(g); 
    groupsMap[gn] = g; 
  }

  const sahadanMatches = [];
  if (data.gamesets) {
    for (const gs of data.gamesets) {
      for (const m of gs.matches) {
        if (m.team_A && m.team_B) {
          const finished = m.status === "Played";
          const isLive = m.status !== "Played" && m.status !== "Fixture";
          let timeElapsed = "notstarted";
          if (finished) timeElapsed = "finished";
          else if (isLive) timeElapsed = m.minute !== undefined ? String(m.minute) : "live";
          
          sahadanMatches.push({
            uuid: m.uuid,
            homeEn: cleanPlaceholderName(enName(m.team_A.name)),
            awayEn: cleanPlaceholderName(enName(m.team_B.name)),
            finished: finished,
            timeElapsed: timeElapsed,
            utcDate: m.date_time_utc
          });
        }
      }
    }
  }

  const games = [];
  if (wcGames && wcGames.games) {
    for (const wg of wcGames.games) {
      const homeTr = TR_NAMES[wg.home_team_name_en] || wg.home_team_name_en;
      const awayTr = TR_NAMES[wg.away_team_name_en] || wg.away_team_name_en;
      
      const tA = ensureTeam(homeTr, "team_" + wg.home_team_id);
      const tB = ensureTeam(awayTr, "team_" + wg.away_team_id);
      
      if (wg.type === "group" && wg.group && groupsMap[wg.group]) {
        const g = groupsMap[wg.group];
        if (tA && tA.groups.indexOf(wg.group) === -1) tA.groups = tA.groups ? tA.groups + "," + wg.group : wg.group;
        if (tB && tB.groups.indexOf(wg.group) === -1) tB.groups = tB.groups ? tB.groups + "," + wg.group : wg.group;
        
        if (tA && !g.teams.find(t => t.team_id === tA.id)) {
          g.teams.push({
            team_id: tA.id,
            name_tr: tA.name_tr,
            name_en: tA.name_en,
            flag: tA.flag,
            fifa_code: tA.fifa_code,
            mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0
          });
        }
        if (tB && !g.teams.find(t => t.team_id === tB.id)) {
          g.teams.push({
            team_id: tB.id,
            name_tr: tB.name_tr,
            name_en: tB.name_en,
            flag: tB.flag,
            fifa_code: tB.fifa_code,
            mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0
          });
        }
      }

      const sMatch = sahadanMatches.find(sm => sm.homeEn === wg.home_team_name_en && sm.awayEn === wg.away_team_name_en);

      let isFinished = wg.finished === "TRUE" || wg.finished === true;
      let elapsed = wg.time_elapsed === "null" ? "notstarted" : wg.time_elapsed;
      let turkeyDateStr = wg.local_date;

      if (sMatch) {
        isFinished = sMatch.finished;
        elapsed = sMatch.timeElapsed;
        if (sMatch.utcDate) {
          turkeyDateStr = toTurkeyTime(sMatch.utcDate);
        }
      }

      let hs = wg.home_score === "null" || wg.home_score === null ? null : parseInt(wg.home_score);
      let as = wg.away_score === "null" || wg.away_score === null ? null : parseInt(wg.away_score);
      
      const s = STADIUM_DETAILS.find(st => st.id === wg.stadium_id);
      const stNameTr = s ? (STADIUM_NAMES_TR[s.id] || s.name_en) : null;
      const stCityTr = s ? (TR_CITIES[s.city_en] || s.city_en) : null;
      const stCountryTr = s ? (TR_COUNTRIES[s.country_en] || s.country_en) : null;

      const game = {
        id: sMatch ? sMatch.uuid : wg.id,
        home_team_id: wg.home_team_id, away_team_id: wg.away_team_id,
        home_team_name_en: wg.home_team_name_en, home_team_name_tr: homeTr,
        away_team_name_en: wg.away_team_name_en, away_team_name_tr: awayTr,
        home_team_flag: flagUrl(homeTr), away_team_flag: flagUrl(awayTr),
        home_score: isNaN(hs) ? null : hs, away_score: isNaN(as) ? null : as,
        home_scorers: wg.home_scorers === "null" ? null : wg.home_scorers, 
        away_scorers: wg.away_scorers === "null" ? null : wg.away_scorers,
        group: wg.group === "null" ? "" : wg.group, 
        matchday: wg.matchday,
        local_date: turkeyDateStr,
        stadium_id: wg.stadium_id === "null" ? null : wg.stadium_id, 
        stadium_name_tr: stNameTr, stadium_city_tr: stCityTr, stadium_country_tr: stCountryTr,
        finished: isFinished, 
        time_elapsed: elapsed,
        type: wg.type, 
        home_team_label: wg.home_team_label === "null" ? null : wg.home_team_label, 
        away_team_label: wg.away_team_label === "null" ? null : wg.away_team_label
      };

      enrichGame(game);
      games.push(game);
    }
  }

  calculateAllStandings(groups, games);
  groups.sort((a, b) => a.name.localeCompare(b.name));
  const stadiums = STADIUM_DETAILS.map(s => ({
    id: s.id, name_en: s.name_en, name_tr: STADIUM_NAMES_TR[s.id] || s.name_en,
    city_en: s.city_en, city_tr: TR_CITIES[s.city_en] || s.city_en,
    country_en: s.country_en, country_tr: TR_COUNTRIES[s.country_en] || s.country_en,
    capacity: s.capacity, region: s.region
  }));

  return { teams, groups, games, stadiums };
}

function calculateAllStandings(groups, games) {
  if (!groups || !games) return;
  
  for (const game of games) {
    if (game.type !== "group") continue;
    if (game.time_elapsed === "notstarted" || game.home_score === null || game.away_score === null) continue;
    
    const group = groups.find(g => g.name === game.group);
    if (!group) continue;
    
    const homeTeam = group.teams.find(t => t.team_id === game.home_team_id);
    const awayTeam = group.teams.find(t => t.team_id === game.away_team_id);
    
    if (homeTeam && awayTeam) {
      const hs = game.home_score;
      const as = game.away_score;
      
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
    }
  }
  
  for (const group of groups) {
    group.teams.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.gd !== a.gd) return b.gd - a.gd;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.name_tr.localeCompare(b.name_tr);
    });
  }
}

async function syncData() {
  try {
    console.log(`[${new Date().toLocaleTimeString("tr-TR")}] Sahadan verisi çekiliyor...`);
    const resp = await fetchCompetition();
    const wcGames = await fetchWorldCupGames();
    const result = transform(resp, wcGames);
    if (!result || !result.games) return;
    cachedData = result;
    console.log(`[${new Date().toLocaleTimeString("tr-TR")}] ${result.games.length} maç, ${result.teams.length} takım`);

    let newDetails = 0;
    for (const game of result.games) {
      const cached = matchDetailsCache[game.id];
      const isLive = game.time_elapsed !== "finished" && game.time_elapsed !== "notstarted";
      const needsFetch = (game.finished && (!cached || !cached.events || !cached.lineup || !cached.stat_team_detailed)) || isLive;
      
      const sahadanId = (game.id && String(game.id).length > 10) ? game.id : null;
      if (needsFetch && sahadanId) {
        console.log(`Detay (${cached ? 'Güncelleniyor' : 'Yeni'}) [isLive=${isLive}]: ${game.home_team_name_tr} vs ${game.away_team_name_tr}`);
        const dd = await fetchMatchDetail(sahadanId, isLive);
        if (dd) {
          matchDetailsCache[game.id] = dd;
          newDetails++;
        }
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    if (newDetails > 0) {
      cachedData = transform(resp, wcGames);
    }
    saveCache();
  } catch (e) {
    console.error("Sync hatası:", e.message);
  }
}

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  if (req.url.startsWith("/api/")) {
    if (!cachedData) {
      res.writeHead(503, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "Veri yükleniyor..." }));
      return;
    }
    const parts = req.url.split("?")[0].split("/").filter(Boolean);
    const ep = parts[1], sub = parts[2];
    const ok = body => { res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" }); res.end(JSON.stringify(body)); };
    const err = (code, msg) => { res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" }); res.end(JSON.stringify({ error: msg })); };
    if (ep === "all") ok(cachedData);
    else if (ep === "games") {
      if (sub) {
        const gl = sub.toUpperCase();
        if (/^[A-L]$/.test(gl)) ok({ group: gl, games: cachedData.games.filter(g => g.type === "group" && g.group === gl) });
        else err(400, "Geçersiz grup harfi.");
      } else ok({ games: cachedData.games });
    } else if (ep === "groups") {
      if (sub) {
        const gl = sub.toUpperCase();
        if (/^[A-L]$/.test(gl)) { const f = cachedData.groups.find(g => g.name === gl); f ? ok(f) : err(404, "Grup yok"); }
        else err(400, "Geçersiz grup harfi.");
      } else ok({ groups: cachedData.groups });
    } else if (ep === "teams") ok({ teams: cachedData.teams });
    else if (ep === "stadiums") ok({ stadiums: cachedData.stadiums });
    else err(404, "Endpoint bulunamadı.");
    return;
  }

  let fp = "." + req.url;
  if (fp === "./") fp = "./index.html";
  fs.readFile(fp, (error, content) => {
    if (error) {
      if (error.code === "ENOENT") {
        fs.readFile("./index.html", (e2, idx) => {
          if (e2) { res.writeHead(404); res.end("404"); return; }
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(idx, "utf-8");
        });
      } else { res.writeHead(500); res.end("Hata"); }
    } else {
      res.writeHead(200, { "Content-Type": MIME_TYPES[String(path.extname(fp)).toLowerCase()] || "application/octet-stream" });
      res.end(content, "utf-8");
    }
  });
});

server.listen(PORT, async () => {
  console.log(`FIFA 2026 API - http://localhost:${PORT}`);
  console.log(`  /api/all      Tüm veriler`);
  console.log(`  /api/games    Maçlar (kadro+istatistik+olaylar eklendi)`);
  console.log(`  /api/games/A  Grup A maçları`);
  console.log(`  /api/groups   Puan durumu`);
  console.log(`  /api/teams    Takımlar`);
  console.log(`  /api/stadiums Stadyumlar`);

  if (!loadCache()) console.log("Cache bulunamadı, API'den çekilecek...");
  await syncData();
  setInterval(syncData, 60000);
});
