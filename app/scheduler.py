from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime
from app.sahadan_service import sahadan_service
from app.db_manager import db
from app.cache_manager import cache
from app.models import FixtureData


class DataUpdateScheduler:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
    
    async def update_data(self):
        """Fetch new data from API and update cache and database."""
        print(f"[{datetime.now()}] Starting data update...")
        try:
            data = await sahadan_service.fetch_all_data()
            print(f"[{datetime.now()}] Fetched {len(data.get('gamesets', []))} gamesets and {len(data.get('rankings', []))} rankings")
            
            # Save to database
            db.save_data(data)
            
            # Update cache
            fixture_data = FixtureData(**data)
            cache.set_fixture_data(fixture_data)
            
            print(f"[{datetime.now()}] Data update completed successfully")
        except Exception as e:
            print(f"[{datetime.now()}] Data update failed: {e}")
    
    def start(self):
        """Start the scheduler with hourly updates at minute 57-59."""
        # Schedule update to run every hour at minute 57
        self.scheduler.add_job(
            self.update_data,
            'cron',
            minute='57',
            id='data_update'
        )
        self.scheduler.start()
        print("Scheduler started - data will update every hour at minute 57")
    
    async def initial_update(self):
        """Run initial data update on startup."""
        await self.update_data()


scheduler = DataUpdateScheduler()
