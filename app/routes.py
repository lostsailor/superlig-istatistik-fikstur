from fastapi import APIRouter, HTTPException
from typing import Optional
from app.cache_manager import cache
from app.models import GameSet, Ranking
from app.scheduler import scheduler

router = APIRouter()


@router.get("/fixture")
async def get_fixture(gameset_uuid: Optional[str] = None):
    """
    Get fixture data.
    If gameset_uuid is provided, returns only that gameset's matches.
    If not provided, returns all gamesets.
    """
    if not cache.is_loaded():
        raise HTTPException(status_code=503, detail="Data not loaded yet")
    
    result = cache.get_gamesets(gameset_uuid)
    
    if result is None:
        raise HTTPException(status_code=404, detail="Gameset not found")
    
    if gameset_uuid:
        return result.dict()
    else:
        return [gs.dict() for gs in result]


@router.get("/rankings")
async def get_rankings():
    """Get all rankings."""
    if not cache.is_loaded():
        raise HTTPException(status_code=503, detail="Data not loaded yet")
    
    rankings = cache.get_rankings()
    return [r.dict() for r in rankings]


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "cache_loaded": cache.is_loaded()
    }


@router.post("/refresh")
async def refresh_data():
    """Manually trigger data refresh."""
    await scheduler.update_data()
    return {"status": "success", "message": "Data refresh triggered"}
