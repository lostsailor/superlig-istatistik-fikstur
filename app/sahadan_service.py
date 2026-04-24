import httpx
from typing import List, Dict, Any, Optional
from app.models import GameSet, Match, Ranking, RankingTeam, MatchStats
from app.translations import translate_stats
import os


class SahadanService:
    def __init__(self):
        self.base_url = os.getenv("SAHADAN_API_BASE_URL", "https://www.sahadan.com/api/index")
        self.competition_uuid = "482ofyysbdbeoxauk19yg7tdt"
    
    async def fetch_competition_data(self) -> Dict[str, Any]:
        """Fetch competition data including gamesets and rankings."""
        url = f"{self.base_url}/soccer-competition-{self.competition_uuid}"
        params = {
            "a": "bs",
            "e": "sac",
            "competition_uuid": self.competition_uuid,
            "language": "tr",
            "country": "tr",
            "application": "mackolik.com"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            return response.json()
    
    async def fetch_match_detail(self, match_uuid: str) -> Dict[str, Any]:
        """Fetch match detail for a specific match."""
        url = f"{self.base_url}/match-detail-{match_uuid}"
        params = {
            "application": "com.kokteyl.mackolik",
            "language": "tr",
            "country": "tr",
            "e": "sam",
            "match_uuid": match_uuid,
            "a": "bs"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            return response.json()
    
    def extract_gamesets(self, data: Dict[str, Any]) -> List[GameSet]:
        """Extract gamesets from API response, excluding unwanted sections."""
        gamesets = []
        
        if "gamesets" not in data:
            return gamesets
        
        for gameset_data in data["gamesets"]:
            matches = []
            
            if "matches" in gameset_data:
                for match_data in gameset_data["matches"]:
                    match = Match(
                        uuid=match_data.get("uuid", ""),
                        home_team=match_data.get("home_team", {}).get("name", ""),
                        away_team=match_data.get("away_team", {}).get("name", ""),
                        home_score=match_data.get("home_score"),
                        away_score=match_data.get("away_score"),
                        status=match_data.get("status", ""),
                        start_time=match_data.get("start_time", ""),
                        raw_data=match_data
                    )
                    matches.append(match)
            
            gameset = GameSet(
                uuid=gameset_data.get("uuid", ""),
                name=gameset_data.get("name", ""),
                start_date=gameset_data.get("start_date", ""),
                end_date=gameset_data.get("end_date", ""),
                matches=matches
            )
            gamesets.append(gameset)
        
        return gamesets
    
    def extract_rankings(self, data: Dict[str, Any]) -> List[Ranking]:
        """Extract rankings from API response."""
        rankings = []
        
        # The requirements mention rankings_live should be included
        if "rankings_live" in data:
            for ranking_data in data["rankings_live"]:
                teams = []
                
                if "table" in ranking_data:
                    for team_data in ranking_data["table"]:
                        team = RankingTeam(
                            position=team_data.get("position", 0),
                            team=team_data.get("team", {}).get("name", ""),
                            played=team_data.get("played", 0),
                            won=team_data.get("won", 0),
                            drawn=team_data.get("drawn", 0),
                            lost=team_data.get("lost", 0),
                            goals_for=team_data.get("goals_for", 0),
                            goals_against=team_data.get("goals_against", 0),
                            goal_difference=team_data.get("goal_difference", 0),
                            points=team_data.get("points", 0)
                        )
                        teams.append(team)
                
                ranking = Ranking(
                    uuid=ranking_data.get("uuid", ""),
                    name=ranking_data.get("name", ""),
                    teams=teams
                )
                rankings.append(ranking)
        
        return rankings
    
    async def enrich_match_with_details(self, match: Match) -> Match:
        """Fetch and add match details to a match object."""
        try:
            detail_data = await self.fetch_match_detail(match.uuid)
            
            # Extract stats from match detail
            stats = {}
            if "stats" in detail_data:
                for stat in detail_data["stats"]:
                    stat_name = stat.get("name", "")
                    stat_value = stat.get("value", "")
                    if stat_name and stat_value:
                        stats[stat_name] = stat_value
            
            # Translate stats to Turkish
            translated_stats = translate_stats(stats)
            
            match.match_stats = MatchStats(**translated_stats)
            match.raw_data = {**match.raw_data, "detail": detail_data} if match.raw_data else {"detail": detail_data}
            
        except Exception as e:
            print(f"Error fetching details for match {match.uuid}: {e}")
        
        return match
    
    async def fetch_all_data(self) -> Dict[str, Any]:
        """Fetch and process all data from Sahadan API."""
        competition_data = await self.fetch_competition_data()
        
        gamesets = self.extract_gamesets(competition_data)
        rankings = self.extract_rankings(competition_data)
        
        # Enrich matches with details
        for gameset in gamesets:
            for i, match in enumerate(gameset.matches):
                gameset.matches[i] = await self.enrich_match_with_details(match)
        
        return {
            "gamesets": [gs.dict() for gs in gamesets],
            "rankings": [r.dict() for r in rankings]
        }


sahadan_service = SahadanService()
