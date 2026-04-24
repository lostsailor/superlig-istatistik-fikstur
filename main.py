from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.routes import router
from app.db_manager import db
from app.scheduler import scheduler
from dotenv import load_dotenv
import os

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Load cache from database if available
    print("Starting application...")
    db_loaded = db.load_to_cache()
    if db_loaded:
        print("Cache loaded from database")
    else:
        print("No existing database found, fetching initial data...")
        await scheduler.initial_update()
    
    # Start the scheduler
    scheduler.start()
    
    yield
    
    # Shutdown
    print("Shutting down application...")
    scheduler.scheduler.shutdown()


app = FastAPI(
    title="Süper Lig İstatistik Fikstür API",
    description="API for Turkish Süper Lig fixtures and statistics",
    version="1.0.0",
    lifespan=lifespan
)

app.include_router(router, prefix="/api")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
