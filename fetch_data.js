const https = require('https');
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const API_URL = 'https://www.sahadan.com/api/index/soccer-competition-482ofyysbdbeoxauk19yg7tdt?a=bs&e=sac&competition_uuid=482ofyysbdbeoxauk19yg7tdt&language=tr&country=tr&application=mackolik.com';
const OUTPUT_FILE = 'data/extracted_data.json';

// Çıkarılacak bölümler
const SECTIONS_TO_EXTRACT = [
  "gamesets",
  "rankings"
  //'form_tables',
  //'rankings_live',
  //'transfers',
  //'stat_top_teams',
  //'stat_top_players',
  //'team_stats',
  //'player_stats'
];

function fetchData(apiUrl) {
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

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (error) {
          reject(new Error(`JSON parse error: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

function extractSections(data, sections) {
  const extracted = {};
  const dataObj = data.data || data;

  sections.forEach(section => {
    if (dataObj[section] !== undefined) {
      extracted[section] = dataObj[section];
      console.log(`✓ ${section} bulundu ve eklendi`);
    } else {
      console.log(`✗ ${section} bulunamadı`);
    }
  });

  return extracted;
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
    const collection = db.collection('competition_data');
    
    // Önce eski verileri temizle
    await collection.deleteMany({});
    
    // Yeni verileri ekle
    await collection.insertOne(data);
    
    console.log('Veriler MongoDB\'ye başarıyla kaydedildi');
  } catch (error) {
    console.error('MongoDB hatası:', error);
  } finally {
    await client.close();
  }
}

async function main() {
  try {
    console.log('API\'den veri çekiliyor...');
    const response = await fetchData(API_URL);
    console.log('Veri başarıyla çekildi');

    console.log('\nİstenen bölümler çıkarılıyor...');
    const extractedData = extractSections(response, SECTIONS_TO_EXTRACT);

    if (Object.keys(extractedData).length === 0) {
      console.log('\nUyarı: Hiçbir bölüm bulunamadı!');
    } else {
      console.log(`\nToplam ${Object.keys(extractedData).length} bölüm çıkarıldı`);
    }

    saveToFile(extractedData, OUTPUT_FILE);
    saveToMongo(extractedData);
    console.log('\nİşlem tamamlandı!');

  } catch (error) {
    console.error('Hata:', error.message);
    process.exit(1);
  }
}

main();
