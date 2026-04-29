const https = require('https');
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

// Maç UUID'sini buraya girin veya komut satırından alın
const MATCH_UUID = process.argv[2] || 'YOUR_MATCH_UUID_HERE';

const API_URL = `https://www.sahadan.com/api/index/match-detail-${MATCH_UUID}?application=com.kokteyl.mackolik&language=tr&country=tr&e=sam&match_uuid=${MATCH_UUID}&a=bs`;

const OUTPUT_FILE = path.join('data', `match_detail_${MATCH_UUID}.json`);

function fetchData(apiUrl, maxRetries = 5) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(apiUrl);
    
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    };

    let retryCount = 0;

    const attemptRequest = () => {
      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            // Check if response starts with HTML
            if (data.trim().startsWith('<html>') || data.trim().startsWith('<!DOCTYPE')) {
              if (retryCount < maxRetries) {
                retryCount++;
                console.log(`API returned HTML, retrying in 3 seconds... (${retryCount}/${maxRetries})`);
                setTimeout(attemptRequest, 3000);
              } else {
                reject(new Error(`API returned HTML instead of JSON after ${maxRetries} retries`));
              }
              return;
            }
            const jsonData = JSON.parse(data);
            resolve(jsonData);
          } catch (error) {
            if (retryCount < maxRetries) {
              retryCount++;
              console.log(`JSON parse error, retrying in 3 seconds... (${retryCount}/${maxRetries})`);
              setTimeout(attemptRequest, 3000);
            } else {
              reject(new Error(`JSON parse error after ${maxRetries} retries: ${error.message}`));
            }
          }
        });
      });

      req.on('error', (error) => {
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`Request error, retrying in 3 seconds... (${retryCount}/${maxRetries})`);
          setTimeout(attemptRequest, 3000);
        } else {
          reject(new Error(`Request failed after ${maxRetries} retries: ${error.message}`));
        }
      });

      req.end();
    };

    attemptRequest();
  });
}

function saveToFile(data, filename) {
  const dir = path.dirname(filename);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filename, JSON.stringify(data, null, 2), 'utf8');
  console.log(`\nVeri '${filename}' dosyasına kaydedildi`);
}

async function saveToMongo(data) {
  const uri = 'mongodb://localhost:27017';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('MongoDB\'e bağlandı');
    
    const db = client.db('futbol_mac_data');
    const collection = db.collection('match_details');
    
    // UUID'yi veriden al
    const matchUuid = data.match?.uuid || MATCH_UUID;
    
    // Önce eski veriyi temizle (aynı UUID ile)
    await collection.deleteMany({ 'match.uuid': matchUuid });
    
    // Yeni veriyi ekle
    await collection.insertOne(data);
    
    console.log(`Maç detayları MongoDB'ye başarıyla kaydedildi (UUID: ${matchUuid})`);
  } catch (error) {
    console.error('MongoDB hatası:', error);
  } finally {
    await client.close();
  }
}

function translateStatTypes(statData) {
  const translations = {
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

  if (!statData) return statData;

  // Her bir periyot için tür çevirisi yap
  ['fh', 'sh', 'a'].forEach(period => {
    if (statData[period] && Array.isArray(statData[period])) {
      statData[period].forEach(stat => {
        if (stat.type && translations[stat.type]) {
          stat.type = translations[stat.type];
        }
      });
    }
  });

  return statData;
}

async function main() {
  try {
    if (MATCH_UUID === 'YOUR_MATCH_UUID_HERE') {
      console.log('Hata: Lütfen bir maç UUID\'si girin!');
      console.log('Kullanım: node fetch_match_detail.js <match_uuid>');
      process.exit(1);
    }

    // Get max retry count from command line arguments
    const maxRetries = parseInt(process.argv[3]) || 5;
    console.log(`API'den veri çekiliyor... (Match UUID: ${MATCH_UUID}, Max Retries: ${maxRetries})`);
    
    const response = await fetchData(API_URL, maxRetries);
    console.log('Veri başarıyla çekildi');

    // Sadece "match" ve "teams_stats" alanlarını tut (data içinde)
    const filteredResponse = {
      match: response.data?.match,
      stat_team_detailed: translateStatTypes(response.data?.stat_team_detailed),
      events: response.data?.events,
      lineup: response.data?.lineup
    };
    

    saveToFile(filteredResponse, OUTPUT_FILE);
    saveToMongo(filteredResponse);
    console.log('\nİşlem tamamlandı!');

  } catch (error) {
    console.error('Hata:', error.message);
    process.exit(1);
  }
}

main();
