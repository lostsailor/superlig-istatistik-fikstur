from typing import Optional, List, Dict, Any
from app.models import FixtureData, GameSet, Ranking


class CacheManager:
    def __init__(self):
        self.fixture_data: Optional[FixtureData] = None
        self.gamesets: List[GameSet] = []
        self.rankings: List[Ranking] = []
    
    def set_fixture_data(self, data: FixtureData):
        self.fixture_data = data
        self.gamesets = data.gamesets
        self.rankings = data.rankings
    
    def get_gamesets(self, gameset_uuid: Optional[str] = None) -> Any:
        if gameset_uuid:
            for gameset in self.gamesets:
                if gameset.uuid == gameset_uuid:
                    return gameset
            return None
        return self.gamesets
    
    def get_rankings(self) -> List[Ranking]:
        return self.rankings
    
    def is_loaded(self) -> bool:
        return self.fixture_data is not None


cache = CacheManager()
