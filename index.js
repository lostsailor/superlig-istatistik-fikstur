const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const db = require('./src/database/db');
const routes = require('./src/routes');
const standingsService = require('./src/services/standingsService');
const matchStatsService = require('./src/services/matchStatsService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 100 // 100 istek
});
app.use('/api/', limiter);

// Routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Veritabanı bağlantısı ve server başlatma
async function startServer() {
  try {
    await db.connect();
    
    // Cron jobs - Her 30 dakikada bir çalışacak
    cron.schedule('*/30 * * * *', async () => {
      console.log('=== Cron job başlatıldı ===');
      
      // Puan durumunu güncelle
      await standingsService.updateStandings();
      
      // Günlük maç istatistiklerini güncelle
      await matchStatsService.updateDailyMatchStats();
      
      console.log('=== Cron job tamamlandı ===');
    });

    // Server başlatma
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server 0.0.0.0:${PORT} üzerinde çalışıyor`);
      console.log(`API: http://0.0.0.0:${PORT}/api`);
      console.log(`Health: http://0.0.0.0:${PORT}/health`);
    });
  } catch (error) {
    console.error('Server başlatma hatası:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Server kapatılıyor...');
  db.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Server kapatılıyor...');
  db.close();
  process.exit(0);
});
