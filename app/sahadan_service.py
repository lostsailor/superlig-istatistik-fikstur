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
        print(f"Fetching match detail for {match_uuid}")
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
                    # Team names are in team_A and team_B fields
                    home_team_name = match_data.get("team_A", {}).get("name", "")
                    away_team_name = match_data.get("team_B", {}).get("name", "")
                    
                    match = Match(
                        uuid=match_data.get("uuid", ""),
                        home_team=home_team_name,
                        away_team=away_team_name,
                        home_score=match_data.get("home_score"),
                        away_score=match_data.get("away_score"),
                        status=match_data.get("status", ""),
                        start_time=match_data.get("date_time_utc", ""),
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
        
        # Try rankings_live first, then fallback to rankings
        rankings_data = data.get("rankings_live", data.get("rankings", []))
        
        # Handle case where rankings_data is a dict with list values
        if isinstance(rankings_data, dict):
            # Flatten the dict values into a single list
            flattened = []
            for value in rankings_data.values():
                if isinstance(value, list):
                    flattened.extend(value)
                else:
                    flattened.append(value)
            rankings_data = flattened
        
        for ranking_data in rankings_data:
            # Skip if ranking_data is a string (likely an ID or error)
            if isinstance(ranking_data, str):
                continue
            
            # Skip if ranking_data is not a dict
            if not isinstance(ranking_data, dict):
                continue
            
            teams = []
            
            # The table data is directly in the ranking dict
            table_data = ranking_data.get("table", [])
            
            if table_data:
                for team_data in table_data:
                    # Map API field names to our model
                    team = RankingTeam(
                        position=team_data.get("rank", 0),
                        team=team_data.get("team", {}).get("name", ""),
                        played=team_data.get("played", 0),
                        won=team_data.get("win", 0),
                        drawn=team_data.get("draw", 0),
                        lost=team_data.get("lost", 0),
                        goals_for=team_data.get("pro", 0),
                        goals_against=team_data.get("against", 0),
                        goal_difference=team_data.get("pro", 0) - team_data.get("against", 0),
                        points=team_data.get("pts", 0)
                    )
                    teams.append(team)
            
            ranking = Ranking(
                uuid=ranking_data.get("competition", {}).get("uuid", ""),
                name=ranking_data.get("name", ""),
                teams=teams
            )
            if teams:  # Only add if we have teams
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
    
    async def fetch_all_data(self, fetch_match_details: bool = False) -> Dict[str, Any]:
        """Fetch and process all data from Sahadan API."""
        competition_data = await self.fetch_competition_data()
        
        # The actual data is nested under 'data' key
        actual_data = competition_data.get("data", competition_data)
        
        gamesets = self.extract_gamesets(actual_data)
        rankings = self.extract_rankings(actual_data)
        
        # Enrich matches with details (optional - disabled by default for performance)
        if fetch_match_details:
            for gameset in gamesets:
                for i, match in enumerate(gameset.matches):
                    gameset.matches[i] = await self.enrich_match_with_details(match)
        
        return {
            "gamesets": [gs.dict() for gs in gamesets],
            "rankings": [r.dict() for r in rankings]
        }


sahadan_service = SahadanService()
