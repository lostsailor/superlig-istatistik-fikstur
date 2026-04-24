from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class MatchStats(BaseModel):
    possession: Optional[str] = None
    expected_goals: Optional[str] = None
    touches_in_opp_box: Optional[str] = None
    shots: Optional[str] = None
    shots_on_target: Optional[str] = None
    shots_off_target: Optional[str] = None
    corners: Optional[str] = None
    fouls: Optional[str] = None
    blocked_shots: Optional[str] = None
    woodwork: Optional[str] = None
    big_chances_missed: Optional[str] = None
    throw_in: Optional[str] = None
    passes: Optional[str] = None
    successful_passes: Optional[str] = None
    crosses: Optional[str] = None
    successful_tackles: Optional[str] = None
    successful_duels: Optional[str] = None
    successful_aerial_duels: Optional[str] = None
    successful_takeons: Optional[str] = None
    clearances: Optional[str] = None
    interceptions: Optional[str] = None
    total_offside: Optional[str] = None
    successful_crosses: Optional[str] = None
    yellow_card: Optional[str] = None
    second_yellow_card: Optional[str] = None
    direct_red_card: Optional[str] = None
    red_card: Optional[str] = None
    passing_accuracy: Optional[str] = None
    running_distance: Optional[str] = None


class Match(BaseModel):
    uuid: str
    home_team: str
    away_team: str
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    status: str
    start_time: str
    match_stats: Optional[MatchStats] = None
    raw_data: Optional[Dict[str, Any]] = None


class GameSet(BaseModel):
    uuid: str
    name: str
    start_date: str
    end_date: str
    matches: List[Match]


class RankingTeam(BaseModel):
    position: int
    team: str
    played: int
    won: int
    drawn: int
    lost: int
    goals_for: int
    goals_against: int
    goal_difference: int
    points: int


class Ranking(BaseModel):
    uuid: str
    name: str
    teams: List[RankingTeam]


class FixtureData(BaseModel):
    gamesets: List[GameSet]
    rankings: List[Ranking]
