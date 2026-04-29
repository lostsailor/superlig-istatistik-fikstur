const express = require('express');
const app = express();
const port = 3000;

const { MongoClient } = require('mongodb');
const { exec } = require('child_process');
const util = require('util');
const cron = require('node-cron');

const execPromise = util.promisify(exec);

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.get('/api', (req, res) => {
  res.send('This is the API endpoint');
});

app.get('/api/get-league-data', async (req, res) => {
    const week = req.query.week;
    const client = new MongoClient('mongodb://localhost:27017');
    await client.connect();
    const db = client.db('futbol_mac_data');
    const collection = db.collection('competition_data');
    
    let data;
    if (week) {
        // Hafta parametresi varsa, o haftaya ait gameset'i filtrele
        const fullData = await collection.findOne({});
        if (fullData && fullData.gamesets) {
            const filteredGameset = fullData.gamesets.find(gameset => gameset.name === week);
            if (filteredGameset) {
                data = { gamesets: [filteredGameset] };
            } else {
                data = { gamesets: [] };
            }
        } else {
            data = { gamesets: [] };
        }
    } else {
        // Hafta parametresi yoksa tüm veriyi getir
        data = await collection.findOne({});
    }
    
    res.json(data);
    await client.close();
});

app.get('/api/match-details', async (req, res) => {
    const matchId = req.query.matchId;
    const client = new MongoClient('mongodb://localhost:27017');
    await client.connect();
    const db = client.db('futbol_mac_data');
    const collection = db.collection('match_details');
    let data;
    do {
        data = await collection.findOne({ 'match.uuid': matchId });
        if (!data) {
            console.log('Data not found, fetching...');
            // Fetch match detail using fetch_match_detail.js
            try {
                const command = `node fetch_match_detail.js ${matchId}`;
                const { stdout, stderr } = await execPromise(command);
                
                if (stderr) {
                    console.error(`Error fetching match ${matchId}:`, stderr);
                }
                
                // Wait a bit for MongoDB to be updated
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
                console.error(`Failed to fetch match ${matchId}:`, error.message);
                // If fetch fails, break the loop to avoid infinite loop
                break;
            }
        }
    } while (!data);
    console.log('Data:', data);
    res.json(data);
    await client.close();
});

// Cron job to automatically fetch match details for played matches
async function syncMatchDetails() {
    console.log('Starting automatic match details sync...');
    
    // First run fetch_data.js to get latest competition data
    console.log('Fetching latest competition data...');
    try {
        const { stdout, stderr } = await execPromise('node fetch_data.js');
        if (stderr) {
            console.error('Error fetching competition data:', stderr);
        } else {
            console.log('Competition data fetched successfully');
        }
        // Wait 15 seconds for data to be processed and saved to MongoDB
        console.log('Waiting 15 seconds for data processing...');
        await new Promise(resolve => setTimeout(resolve, 15000));
    } catch (error) {
        console.error('Failed to fetch competition data:', error.message);
    }
    const client = new MongoClient('mongodb://localhost:27017');
    await client.connect();
    const db = client.db('futbol_mac_data');
    const competitionCollection = db.collection('competition_data');
    const matchDetailsCollection = db.collection('match_details');
    
    try {
        // Get all matches from competition data
        const competitionData = await competitionCollection.findOne({});
        if (!competitionData || !competitionData.gamesets) {
            console.log('No competition data found');
            return;
        }
        
        let totalMatches = 0;
        let fetchedMatches = 0;
        
        // Process each gameset
        for (const gameset of competitionData.gamesets) {
            for (const match of gameset.matches) {
                totalMatches++;
                
                // Check if match is played
                if (match.status === 'Played') {
                    // Check if match details already exist
                    const existingDetails = await matchDetailsCollection.findOne({ 'match.uuid': match.uuid });
                    
                    if (!existingDetails) {
                        console.log(`Fetching details for match: ${match.uuid} (${match.team_A?.name} vs ${match.team_B?.name})`);
                        
                        try {
                            // Fetch match details
                            const command = `node fetch_match_detail.js ${match.uuid}`;
                            await execPromise(command);
                            fetchedMatches++;
                            
                            // Wait a bit to avoid overwhelming API
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        } catch (error) {
                            console.error(`Failed to fetch match ${match.uuid}:`, error.message);
                        }
                    }
                }
            }
        }
        
        console.log(`Sync completed: ${fetchedMatches}/${totalMatches} played matches fetched`);
        
    } catch (error) {
        console.error('Sync error:', error);
    } finally {
        await client.close();
    }
}

// Schedule cron job to run every hour
cron.schedule('0 * * * *', syncMatchDetails);

// Schedule cron job to run daily at 2 AM for full sync
cron.schedule('0 2 * * *', syncMatchDetails);

console.log('Cron jobs scheduled for automatic match details sync');

// Run initial sync on startup
syncMatchDetails();

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
