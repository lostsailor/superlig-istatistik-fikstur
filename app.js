// FIFA World Cup 2026 - Main Application Logic

// Global state
let appData = null;
let activeTab = 'matches';
let filterStage = 'all';
let filterTeam = 'all';
let searchQuery = '';
let lastUpdateDate = null;

// Stadium timezone offsets in June/July 2026 (relative to UTC)
const STADIUM_OFFSETS = {
  "1": -6,  // Estadio Azteca (Mexico City) -> UTC-6
  "2": -6,  // Estadio Akron (Guadalajara) -> UTC-6
  "3": -6,  // Estadio BBVA (Monterrey) -> UTC-6
  "4": -5,  // AT&T Stadium (Dallas) -> UTC-5
  "5": -5,  // NRG Stadium (Houston) -> UTC-5
  "6": -5,  // GEHA Field at Arrowhead Stadium (Kansas City) -> UTC-5
  "7": -4,  // Mercedes-Benz Stadium (Atlanta) -> UTC-4
  "8": -4,  // Hard Rock Stadium (Miami) -> UTC-4
  "9": -4,  // Gillette Stadium (Boston) -> UTC-4
  "10": -4, // Lincoln Financial Field (Philadelphia) -> UTC-4
  "11": -4, // MetLife Stadium (New York/New Jersey) -> UTC-4
  "12": -4, // BMO Field (Toronto) -> UTC-4
  "13": -7, // BC Place (Vancouver) -> UTC-7
  "14": -7, // Lumen Field (Seattle) -> UTC-7
  "15": -7, // Levi's Stadium (San Francisco/Santa Clara) -> UTC-7
  "16": -7  // SoFi Stadium (Los Angeles) -> UTC-7
};

// Convert match local time string ("MM/DD/YYYY HH:MM") to Turkey Time (UTC+3) string
function convertDateToTurkeyTime(localDateStr, stadiumId) {
  try {
    const parts = localDateStr.split(' ');
    const dateParts = parts[0].split('/');
    const timeParts = parts[1].split(':');
    
    const month = parseInt(dateParts[0]) - 1;
    const day = parseInt(dateParts[1]);
    const year = parseInt(dateParts[2]);
    const hour = parseInt(timeParts[0]);
    const minute = parseInt(timeParts[1]);
    
    const stadiumOffset = STADIUM_OFFSETS[stadiumId] || -5;
    
    // Create UTC date object
    const utcDate = new Date(Date.UTC(year, month, day, hour - stadiumOffset, minute));
    
    // Add 3 hours for Turkey Time (UTC+3)
    const turkeyDate = new Date(utcDate.getTime() + (3 * 60 * 60 * 1000));
    
    const pad = (num) => String(num).padStart(2, '0');
    return `${pad(turkeyDate.getUTCMonth() + 1)}/${pad(turkeyDate.getUTCDate())}/${turkeyDate.getUTCFullYear()} ${pad(turkeyDate.getUTCHours())}:${pad(turkeyDate.getUTCMinutes())}`;
  } catch (e) {
    console.error('Error converting date to Turkey Time:', e);
    return localDateStr;
  }
}

// API Endpoints (Local Gateway Proxy)
const API_URLS = {
  all: '/api/all'
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  // Load static fallback data first
  if (typeof WORLD_CUP_2026_DATA !== 'undefined') {
    appData = JSON.parse(JSON.stringify(WORLD_CUP_2026_DATA));
    // Convert static games dates to Turkey Time
    if (appData && appData.games) {
      appData.games.forEach(g => {
        g.local_date = convertDateToTurkeyTime(g.local_date, g.stadium_id);
      });
    }
    updateStatusIndicator('local');
  } else {
    console.error('Static data not found! Please check data.js.');
  }

  // Bind Events
  setupTabs();
  setupFilters();
  setupRefresh();
  setupExcelExport();
  
  // Initial render
  renderAll();

  // Try to load live data asynchronously
  fetchLiveData();

  // Auto-refresh every 60 seconds
  setInterval(fetchLiveData, 60000);
});

// Update Status Indicator
function updateStatusIndicator(status, message = '') {
  const dot = document.getElementById('status-dot');
  const text = document.getElementById('status-text');
  
  if (status === 'live') {
    dot.className = 'status-dot';
    const timeStr = lastUpdateDate ? lastUpdateDate.toLocaleTimeString('tr-TR') : new Date().toLocaleTimeString('tr-TR');
    text.textContent = `Canlı Veri Bağlantısı: Aktif (TSİ ${timeStr}) | 60sn'de bir güncellenir`;
  } else if (status === 'local') {
    dot.className = 'status-dot local';
    text.textContent = 'Yerel Veri Kullanılıyor (Çevrimdışı/Yedek)';
  } else if (status === 'loading') {
    // Keep dot style, but show loading text
    text.textContent = 'Veriler güncelleniyor...';
  }
}

// Fetch Live Data from our Local API Gateway
async function fetchLiveData() {
  updateStatusIndicator('loading');
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) refreshBtn.classList.add('loading');

  try {
    const headers = { 'Accept': 'application/json' };
    const response = await fetch(API_URLS.all, { headers });
    const data = await response.json();

    if (data && data.games && data.groups && data.teams && data.stadiums) {
      console.log('Live data fetched from local API successfully!');
      
      // Save directly to global state since the server did all translations and timezone conversions!
      appData = data;
      
      // Re-render and populate dropdown
      renderAll();
      populateTeamDropdown();
      lastUpdateDate = new Date();
      updateStatusIndicator('live');
    } else {
      throw new Error('API returned incomplete data format.');
    }
  } catch (error) {
    console.warn('Could not fetch live data from API, falling back to local dataset.', error);
    updateStatusIndicator('local');
  } finally {
    if (refreshBtn) refreshBtn.classList.remove('loading');
  }
}

// Process live API data and integrate with translations
function processIncomingLiveData(apiGames, apiGroups, apiTeams, apiStadiums) {
  // Translate lists using static translation keys
  const trTeams = {
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

  const trCities = {
    "Seattle": "Seattle", "Miami (Miami Gardens)": "Miami", "Vancouver": "Vancouver",
    "San Francisco Bay Area (Santa Clara)": "San Francisco", "Monterrey (Guadalupe)": "Monterrey",
    "Mexico City": "Meksiko", "Guadalajara (Zapopan)": "Guadalajara", "Houston": "Houston",
    "Los Angeles (Inglewood)": "Los Angeles", "Atlanta": "Atlanta", "Boston (Foxborough)": "Boston",
    "Kansas City": "Kansas City", "Philadelphia": "Philadelphia", "Dallas (Arlington, Texas)": "Dallas",
    "New York/New Jersey (East Rutherford)": "New York / New Jersey", "Toronto": "Toronto"
  };

  const trStadiums = {
    "Lumen Field": "Lumen Field", "Hard Rock Stadium": "Hard Rock Stadyumu", "BC Place": "BC Place",
    "Levi's Stadium": "Levi's Stadyumu", "Estadio BBVA": "Estadio BBVA", "Estadio Azteca": "Estadio Azteca",
    "Estadio Akron": "Estadio Akron", "NRG Stadium": "NRG Stadyumu", "SoFi Stadium": "SoFi Stadyumu",
    "Mercedes-Benz Stadium": "Mercedes-Benz Stadyumu", "Gillette Stadium": "Gillette Stadyumu",
    "GEHA Field at Arrowhead Stadium": "Arrowhead Stadyumu", "Lincoln Financial Field": "Lincoln Financial Field",
    "AT&T Stadium": "AT&T Stadyumu", "MetLife Stadium": "MetLife Stadyumu", "BMO Field": "BMO Field"
  };

  const trCountries = {
    "United States": "ABD", "Mexico": "Meksika", "Canada": "Kanada"
  };

  // 1. Teams
  const teams = apiTeams.map(t => ({
    id: t.id,
    name_en: t.name_en,
    name_tr: trTeams[t.name_en] || t.name_en,
    flag: t.flag,
    fifa_code: t.fifa_code,
    groups: t.groups
  }));

  // 2. Stadiums
  const stadiums = apiStadiums.map(s => ({
    id: s.id,
    name_en: s.name_en,
    name_tr: trStadiums[s.name_en] || s.name_en,
    city_en: s.city_en,
    city_tr: trCities[s.city_en] || s.city_en,
    country_en: s.country_en,
    country_tr: trCountries[s.country_en] || s.country_en,
    capacity: s.capacity,
    region: s.region
  }));

  // 3. Groups
  const groups = apiGroups.map(g => ({
    name: g.name,
    teams: g.teams.map(gt => {
      const teamInfo = teams.find(t => t.id === gt.team_id);
      return {
        team_id: gt.team_id,
        name_en: teamInfo ? teamInfo.name_en : `Team ${gt.team_id}`,
        name_tr: teamInfo ? teamInfo.name_tr : `Takım ${gt.team_id}`,
        flag: teamInfo ? teamInfo.flag : "",
        fifa_code: teamInfo ? teamInfo.fifa_code : "",
        mp: parseInt(gt.mp) || 0,
        w: parseInt(gt.w) || 0,
        d: parseInt(gt.d) || 0,
        l: parseInt(gt.l) || 0,
        gf: parseInt(gt.gf) || 0,
        ga: parseInt(gt.ga) || 0,
        gd: parseInt(gt.gd) || 0,
        pts: parseInt(gt.pts) || 0
      };
    })
  }));

  // 4. Games
  const games = apiGames.map(g => {
    const homeTeam = teams.find(t => t.id === g.home_team_id);
    const awayTeam = teams.find(t => t.id === g.away_team_id);
    const stadium = stadiums.find(s => s.id === g.stadium_id);

    return {
      id: g.id,
      home_team_id: g.home_team_id,
      away_team_id: g.away_team_id,
      home_team_name_en: g.home_team_name_en,
      home_team_name_tr: homeTeam ? homeTeam.name_tr : g.home_team_name_en,
      away_team_name_en: g.away_team_name_en,
      away_team_name_tr: awayTeam ? awayTeam.name_tr : g.away_team_name_en,
      home_team_flag: homeTeam ? homeTeam.flag : "",
      away_team_flag: awayTeam ? awayTeam.flag : "",
      home_score: g.home_score,
      away_score: g.away_score,
      home_scorers: g.home_scorers,
      away_scorers: g.away_scorers,
      group: g.group,
      matchday: g.matchday,
      local_date: convertDateToTurkeyTime(g.local_date, g.stadium_id),
      stadium_id: g.stadium_id,
      stadium_name_tr: stadium ? stadium.name_tr : "",
      stadium_city_tr: stadium ? stadium.city_tr : "",
      stadium_country_tr: stadium ? stadium.country_tr : "",
      finished: g.finished === "TRUE" || g.finished === true,
      time_elapsed: g.time_elapsed,
      type: g.type,
      home_team_label: g.home_team_label,
      away_team_label: g.away_team_label
    };
  });

  // Save to global state
  appData = { teams, groups, games, stadiums };
  
  // Re-render dashboard
  renderAll();
  populateTeamDropdown();
}

// Populate team selection dropdown
function populateTeamDropdown() {
  const select = document.getElementById('filter-team');
  if (!select) return;
  
  // Keep the first option
  select.innerHTML = '<option value="all">Tüm Takımlar</option>';
  
  // Sort teams alphabetically by Turkish name
  const sortedTeams = [...appData.teams].sort((a, b) => a.name_tr.localeCompare(b.name_tr));
  
  sortedTeams.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.name_tr;
    select.appendChild(opt);
  });
}

// Tab Switching logic
function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tabName = e.target.getAttribute('data-tab');
      activeTab = tabName;
      
      // Update buttons
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      
      // Update content divs
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      document.getElementById(`${tabName}-tab`).classList.add('active');
      
      // Show/Hide filter bar (only show on matches tab)
      const filterBar = document.getElementById('filter-bar');
      if (filterBar) {
        if (tabName === 'matches') {
          filterBar.style.display = 'flex';
        } else {
          filterBar.style.display = 'none';
        }
      }
    });
  });
}

// Setup Event Listeners for Filters
function setupFilters() {
  const selectStage = document.getElementById('filter-stage');
  const selectTeam = document.getElementById('filter-team');
  const searchInput = document.getElementById('search-matches');

  if (selectStage) {
    selectStage.addEventListener('change', (e) => {
      filterStage = e.target.value;
      renderMatches();
    });
  }

  if (selectTeam) {
    selectTeam.addEventListener('change', (e) => {
      filterTeam = e.target.value;
      renderMatches();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      renderMatches();
    });
  }
}

// Setup Refresh Button
function setupRefresh() {
  const btn = document.getElementById('refresh-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      fetchLiveData();
    });
  }
}

// Main Render Function
function renderAll() {
  if (!appData) return;
  
  renderMatches();
  renderGroups();
  renderStadiums();
  renderBracket();
}

// Render Match Cards
function renderMatches() {
  const container = document.getElementById('matches-grid-container');
  if (!container) return;

  container.innerHTML = '';
  
  // Filter games
  let filtered = appData.games.filter(g => {
    // Filter by stage
    if (filterStage !== 'all') {
      if (filterStage === 'group' && g.type !== 'group') return false;
      if (filterStage === 'knockout' && g.type === 'group') return false;
    }
    
    // Filter by team
    if (filterTeam !== 'all') {
      if (g.home_team_id !== filterTeam && g.away_team_id !== filterTeam) return false;
    }
    
    // Filter by search query (team name, city, or stadium)
    if (searchQuery !== '') {
      const matchText = `${g.home_team_name_tr} ${g.away_team_name_tr} ${g.stadium_name_tr} ${g.stadium_city_tr} ${g.group}`.toLowerCase();
      if (!matchText.includes(searchQuery)) return false;
    }
    
    return true;
  });

  // Sort matches by date
  filtered.sort((a, b) => {
    const parseDate = (dStr) => {
      // Input is usually: "MM/DD/YYYY HH:MM"
      const parts = dStr.split(' ');
      const dateParts = parts[0].split('/');
      const timeParts = parts[1].split(':');
      return new Date(dateParts[2], dateParts[0] - 1, dateParts[1], timeParts[0], timeParts[1]);
    };
    try {
      return parseDate(a.local_date) - parseDate(b.local_date);
    } catch (e) {
      return a.id - b.id;
    }
  });

  if (filtered.length === 0) {
    container.innerHTML = '<div class="no-results">Kriterlere uygun maç bulunamadı.</div>';
    return;
  }

  // Generate Match Cards HTML
  filtered.forEach(m => {
    const isLive = m.time_elapsed && m.time_elapsed !== 'notstarted' && !m.finished;
    
    const card = document.createElement('div');
    card.className = `match-card ${m.finished ? 'finished' : ''} ${isLive ? 'live' : ''}`;
    
    // Stage tag styling class
    const isKnockout = m.type !== 'group';
    const stageLabel = getStageLabelTr(m.type, m.group, m.matchday);
    
    // Scores and team statuses
    let scoreDisplayHome = m.finished || isLive ? m.home_score : '-';
    let scoreDisplayAway = m.finished || isLive ? m.away_score : '-';
    
    // Highlight winner if finished
    let homeClass = '';
    let awayClass = '';
    if (m.finished) {
      const hScore = parseInt(m.home_score);
      const aScore = parseInt(m.away_score);
      if (hScore > aScore) {
        homeClass = 'winner';
        awayClass = 'loser';
      } else if (aScore > hScore) {
        homeClass = 'loser';
        awayClass = 'winner';
      }
    }

    // Format local date elegantly in Turkish
    const formattedDate = formatMatchDateTr(m.local_date);

    card.innerHTML = `
      <div class="match-header">
        <span class="match-stage ${isKnockout ? 'knockout' : ''}">${stageLabel}</span>
        <div class="match-time-status">
          ${isLive ? `<span class="live-badge">CANLI - ${m.time_elapsed}'</span>` : ''}
          ${m.finished ? '<span>Bitti</span>' : ''}
          ${!m.finished && !isLive ? '<span>Oynanmadı</span>' : ''}
        </div>
      </div>
      <div class="match-body">
        <div class="team-row ${homeClass}">
          <div class="team-info">
            ${m.home_team_flag ? `<img src="${m.home_team_flag}" class="team-flag" alt="${m.home_team_name_tr}" onerror="this.src='https://flagcdn.com/w80/un.png'">` : `<div style="width:34px;height:24px;background:#1e293b;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:0.6rem;font-weight:700;color:var(--text-secondary)">TBD</div>`}
            <span class="team-name">${m.home_team_id === "0" ? (m.home_team_label || 'Bilinmiyor') : m.home_team_name_tr}</span>
          </div>
          <span class="team-score">${scoreDisplayHome}</span>
        </div>
        <div class="team-row ${awayClass}">
          <div class="team-info">
            ${m.away_team_flag ? `<img src="${m.away_team_flag}" class="team-flag" alt="${m.away_team_name_tr}" onerror="this.src='https://flagcdn.com/w80/un.png'">` : `<div style="width:34px;height:24px;background:#1e293b;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:0.6rem;font-weight:700;color:var(--text-secondary)">TBD</div>`}
            <span class="team-name">${m.away_team_id === "0" ? (m.away_team_label || 'Bilinmiyor') : m.away_team_name_tr}</span>
          </div>
          <span class="team-score">${scoreDisplayAway}</span>
        </div>
        ${m.finished && m.home_scorers !== 'null' && m.away_scorers !== 'null' && (m.home_scorers || m.away_scorers) ? `
          <div class="scorers">
            ${m.home_scorers && m.home_scorers !== 'null' ? `⚽ ${m.home_scorers}` : ''} 
            ${m.away_scorers && m.away_scorers !== 'null' ? `<br>⚽ ${m.away_scorers}` : ''}
          </div>
        ` : ''}
      </div>
      <div class="match-footer">
        <div class="match-date">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          <span>${formattedDate}</span>
        </div>
        <div class="match-stadium">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          <span>${m.stadium_name_tr || 'Stadyum Belirtilmedi'} (${m.stadium_city_tr}, ${m.stadium_country_tr})</span>
        </div>
      </div>
    `;
    
    container.appendChild(card);
  });
}

// Render Standings
function renderGroups() {
  const container = document.getElementById('groups-grid-container');
  if (!container) return;
  
  container.innerHTML = '';

  // Sort groups alphabetically
  const sortedGroups = [...appData.groups].sort((a, b) => a.name.localeCompare(b.name));

  sortedGroups.forEach(g => {
    const card = document.createElement('div');
    card.className = 'group-card';
    
    // Sort teams inside group by points, then goal difference, then goals scored
    const sortedTeams = [...g.teams].sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.gd !== a.gd) return b.gd - a.gd;
      return b.gf - a.gf;
    });

    let tableRowsHtml = '';
    sortedTeams.forEach((t, index) => {
      const pos = index + 1;
      let rowClass = '';
      if (pos === 1) rowClass = 'advances-top';
      else if (pos === 2) rowClass = 'advances-next';

      tableRowsHtml += `
        <tr class="${rowClass}">
          <td class="pos-col">${pos}</td>
          <td class="team-col">
            <div class="table-team-name">
              ${t.flag ? `<img src="${t.flag}" class="table-flag" alt="${t.name_tr}" onerror="this.src='https://flagcdn.com/w80/un.png'">` : ''}
              <span>${t.name_tr}</span>
            </div>
          </td>
          <td>${t.mp}</td>
          <td>${t.w}</td>
          <td>${t.d}</td>
          <td>${t.l}</td>
          <td>${t.gd}</td>
          <td class="pts-col">${t.pts}</td>
        </tr>
      `;
    });

    card.innerHTML = `
      <h3 class="group-title">${g.name} Grubu</h3>
      <table class="standing-table">
        <thead>
          <tr>
            <th class="pos-col">#</th>
            <th class="team-col">Takım</th>
            <th>O</th>
            <th>G</th>
            <th>B</th>
            <th>M</th>
            <th>AV</th>
            <th class="pts-col">P</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
        </tbody>
      </table>
    `;

    container.appendChild(card);
  });
}

// Render Stadiums
function renderStadiums() {
  const container = document.getElementById('stadiums-grid-container');
  if (!container) return;
  
  container.innerHTML = '';
  
  // Sort stadiums by country, then city
  const sortedStadiums = [...appData.stadiums].sort((a, b) => {
    if (a.country_en !== b.country_en) return a.country_en.localeCompare(b.country_en);
    return a.city_tr.localeCompare(b.city_tr);
  });

  sortedStadiums.forEach(s => {
    const card = document.createElement('div');
    card.className = 'stadium-card';
    
    const countryTagClass = s.country_en.toLowerCase().replace(' ', '');
    const formattedCapacity = new Intl.NumberFormat('tr-TR').format(s.capacity);

    card.innerHTML = `
      <span class="stadium-country-tag ${countryTagClass}">${s.country_tr}</span>
      <div>
        <h3 class="stadium-name">${s.name_tr}</h3>
        <p class="stadium-city">${s.city_tr}</p>
      </div>
      <div class="stadium-stats">
        <div>
          <span class="stat-label">Bölge:</span>
          <span class="stat-value" style="margin-left: 5px;">${translateRegion(s.region)}</span>
        </div>
        <div>
          <span class="stat-label">Kapasite:</span>
          <span class="stat-value">${formattedCapacity}</span>
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}

// Render Bracket / Knockout Stage
function renderBracket() {
  const container = document.getElementById('bracket-container');
  if (!container) return;

  // We filter out only knockout games
  const r32Matches = appData.games.filter(g => g.type === 'r32');
  const r16Matches = appData.games.filter(g => g.type === 'r16');
  const qfMatches = appData.games.filter(g => g.type === 'qf');
  const sfMatches = appData.games.filter(g => g.type === 'sf');
  const finalMatch = appData.games.find(g => g.type === 'final');

  // Let's create columns for: Son 16 -> Çeyrek Final -> Yarı Final -> Final
  // We can render a visual bracket
  // Since 48 teams has a Son 32, a full bracket is huge. We can display R16 onwards visually, and offer details.
  
  const createBracketCard = (m) => {
    if (!m) return '';
    const hName = m.home_team_id === "0" ? (m.home_team_label || 'TBD') : m.home_team_name_tr;
    const aName = m.away_team_id === "0" ? (m.away_team_label || 'TBD') : m.away_team_name_tr;
    const isLive = m.time_elapsed && m.time_elapsed !== 'notstarted' && !m.finished;
    
    let scoreHome = m.finished || isLive ? m.home_score : '-';
    let scoreAway = m.finished || isLive ? m.away_score : '-';

    let hClass = '';
    let aClass = '';
    if (m.finished) {
      if (parseInt(m.home_score) > parseInt(m.away_score)) hClass = 'winner';
      else if (parseInt(m.away_score) > parseInt(m.home_score)) aClass = 'winner';
    }

    return `
      <div class="bracket-match">
        <div class="bracket-team ${hClass}">
          <span class="bracket-team-name">
            ${m.home_team_flag ? `<img src="${m.home_team_flag}" class="table-flag" alt="">` : ''}
            <span>${hName}</span>
          </span>
          <span class="bracket-score">${scoreHome}</span>
        </div>
        <div class="bracket-team ${aClass}">
          <span class="bracket-team-name">
            ${m.away_team_flag ? `<img src="${m.away_team_flag}" class="table-flag" alt="">` : ''}
            <span>${aName}</span>
          </span>
          <span class="bracket-score">${scoreAway}</span>
        </div>
        <div class="bracket-match-info">
          Maç ${m.id} | ${m.stadium_city_tr || 'TBD'}
        </div>
      </div>
    `;
  };

  // Build brackets columns: R16 (8 matches), QF (4 matches), SF (2 matches), Final (1 match)
  // To keep UI neat, we render R16 matches in sets
  let r16Html = '<div class="bracket-column"><div class="bracket-col-title">Son 16</div>';
  r16Matches.forEach(m => { r16Html += createBracketCard(m); });
  r16Html += '</div>';

  let qfHtml = '<div class="bracket-column"><div class="bracket-col-title">Çeyrek Final</div>';
  qfMatches.forEach(m => { qfHtml += createBracketCard(m); });
  qfHtml += '</div>';

  let sfHtml = '<div class="bracket-column"><div class="bracket-col-title">Yarı Final</div>';
  sfMatches.forEach(m => { sfHtml += createBracketCard(m); });
  sfHtml += '</div>';

  let finalHtml = '<div class="bracket-column"><div class="bracket-col-title">Final</div>';
  if (finalMatch) {
    finalHtml += createBracketCard(finalMatch);
    
    // Add third place details below final
    const thirdMatch = appData.games.find(g => g.type === 'third');
    if (thirdMatch) {
      finalHtml += '<div style="margin-top: 40px;"></div>';
      finalHtml += '<div class="bracket-col-title" style="border-bottom: 1px dashed var(--border-color); font-size: 0.85rem;">Üçüncülük Maçı</div>';
      finalHtml += createBracketCard(thirdMatch);
    }
  }
  finalHtml += '</div>';

  container.innerHTML = r16Html + qfHtml + sfHtml + finalHtml;
}

// Helpers
function getStageLabelTr(type, group, matchday) {
  switch (type) {
    case 'group':
      return `${group} Grubu - Maç ${matchday}`;
    case 'r32':
      return 'Son 32 Turu';
    case 'r16':
      return 'Son 16 Turu';
    case 'qf':
      return 'Çeyrek Final';
    case 'sf':
      return 'Yarı Final';
    case 'third':
      return 'Üçüncülük Maçı';
    case 'final':
      return 'FİNAL';
    default:
      return type;
  }
}

function translateRegion(region) {
  const regions = {
    'Western': 'Batı',
    'Central': 'Merkez',
    'Eastern': 'Doğu'
  };
  return regions[region] || region;
}

function formatMatchDateTr(dateStr) {
  // Input: "06/11/2026 13:00"
  try {
    const parts = dateStr.split(' ');
    const dateParts = parts[0].split('/');
    const timeParts = parts[1].split(':');
    
    const date = new Date(dateParts[2], dateParts[0] - 1, dateParts[1], timeParts[0], timeParts[1]);
    
    const options = { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric', 
      weekday: 'long',
      hour: '2-digit', 
      minute: '2-digit' 
    };
    return date.toLocaleDateString('tr-TR', options);
  } catch (e) {
    return dateStr;
  }
}

function formatMatchDateOnlyTr(dateStr) {
  try {
    const parts = dateStr.split(' ');
    const dateParts = parts[0].split('/');
    const timeParts = parts[1].split(':');
    const date = new Date(dateParts[2], dateParts[0] - 1, dateParts[1], timeParts[0], timeParts[1]);
    
    const options = { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric', 
      weekday: 'long'
    };
    return date.toLocaleDateString('tr-TR', options);
  } catch (e) {
    return dateStr.split(' ')[0] || dateStr;
  }
}

function formatMatchTimeOnly(dateStr) {
  try {
    const parts = dateStr.split(' ');
    return parts[1] || '';
  } catch (e) {
    return '';
  }
}

// Setup Excel Export
function setupExcelExport() {
  const btn = document.getElementById('excel-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      exportToExcel();
    });
  }
}

// Export to Excel function using SheetJS
function exportToExcel() {
  if (!appData) {
    alert('Dışa aktarılacak veri bulunamadı.');
    return;
  }

  try {
    // 1. Prepare matches sheet
    const matchesData = appData.games.map(g => {
      const hName = g.home_team_id === "0" ? (g.home_team_label || 'Bilinmiyor') : g.home_team_name_tr;
      const aName = g.away_team_id === "0" ? (g.away_team_label || 'Bilinmiyor') : g.away_team_name_tr;
      const score = g.finished || (g.time_elapsed && g.time_elapsed !== 'notstarted') ? `${g.home_score} - ${g.away_score}` : 'Oynanmadı';
      
      let stageVal = '';
      let groupVal = '';
      let matchdayVal = '';

      if (g.type === 'group') {
        stageVal = 'Grup Aşaması';
        groupVal = `${g.group} Grubu`;
        matchdayVal = `${g.matchday}. Maç`;
      } else {
        stageVal = getStageLabelTr(g.type, g.group, g.matchday);
        groupVal = '';
        matchdayVal = '';
      }

      return {
        'Maç No': g.id,
        'Aşama': stageVal,
        'Grup': groupVal,
        'Maç Günü': matchdayVal,
        'Tarih': formatMatchDateOnlyTr(g.local_date),
        'Saat': formatMatchTimeOnly(g.local_date),
        'Ev Sahibi Takım': hName,
        'Skor': score,
        'Deplasman Takım': aName,
        'Stadyum': g.stadium_name_tr || 'Stadyum Belirtilmedi',
        'Şehir': g.stadium_city_tr || '',
        'Ülke': g.stadium_country_tr || '',
        'Goller (Ev)': g.home_scorers !== 'null' ? (g.home_scorers || '') : '',
        'Goller (Dep)': g.away_scorers !== 'null' ? (g.away_scorers || '') : '',
        'Durum': g.finished ? 'Bitti' : (g.time_elapsed && g.time_elapsed !== 'notstarted' ? `Canlı (${g.time_elapsed}')` : 'Oynanmadı')
      };
    });

    // 2. Prepare standings sheet
    const standingsData = [];
    const sortedGroups = [...appData.groups].sort((a, b) => a.name.localeCompare(b.name));
    
    sortedGroups.forEach(g => {
      const sortedTeams = [...g.teams].sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.gd !== a.gd) return b.gd - a.gd;
        return b.gf - a.gf;
      });

      sortedTeams.forEach((t, index) => {
        standingsData.push({
          'Grup': `${g.name} Grubu`,
          'Sıra': index + 1,
          'Takım': t.name_tr,
          'Oynanan (O)': t.mp,
          'Galibiyet (G)': t.w,
          'Beraberlik (B)': t.d,
          'Mağlubiyet (M)': t.l,
          'Atılan Gol (AG)': t.gf,
          'Yenilen Gol (YG)': t.ga,
          'Averaj (AV)': t.gd,
          'Puan (P)': t.pts
        });
      });
    });

    // 3. Prepare stadiums sheet
    const stadiumsData = appData.stadiums.map(s => ({
      'Stadyum Adı': s.name_tr,
      'Şehir': s.city_tr,
      'Ülke': s.country_tr,
      'Kapasite': s.capacity,
      'Bölge': translateRegion(s.region)
    }));

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Convert arrays to sheets
    const wsMatches = XLSX.utils.json_to_sheet(matchesData);
    const wsStandings = XLSX.utils.json_to_sheet(standingsData);
    const wsStadiums = XLSX.utils.json_to_sheet(stadiumsData);

    // Append sheets
    XLSX.utils.book_append_sheet(wb, wsMatches, 'Fikstür ve Skorlar');
    XLSX.utils.book_append_sheet(wb, wsStandings, 'Puan Durumu');
    XLSX.utils.book_append_sheet(wb, wsStadiums, 'Stadyumlar');

    // Trigger download
    XLSX.writeFile(wb, 'FIFA_Dunya_Kupasi_2026_Verileri.xlsx');
  } catch (error) {
    console.error('Excel export failed:', error);
    alert('Excel dosyası oluşturulurken bir hata oluştu: ' + error.message);
  }
}
