import json
import os
from typing import Optional
from app.models import FixtureData
from app.cache_manager import cache


class DBManager:
    def __init__(self, db_path: str = "data/database.json"):
        self.db_path = db_path
        self.ensure_db_exists()
    
    def ensure_db_exists(self):
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        if not os.path.exists(self.db_path):
            self.save_data({"gamesets": [], "rankings": []})
    
    def load_data(self) -> Optional[dict]:
        try:
            with open(self.db_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return None
    
    def save_data(self, data: dict):
        with open(self.db_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def load_to_cache(self):
        data = self.load_data()
        if data:
            fixture_data = FixtureData(**data)
            cache.set_fixture_data(fixture_data)
            return True
        return False


db = DBManager()
