import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from bson import ObjectId
from pymongo import MongoClient
from pymongo.server_api import ServerApi
import logging

# =========================
# LOGGING
# =========================
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mongo")

# =========================
# REMOVE .env DEPENDENCY FOR LAMBDA
# =========================
ROOT_DIR = Path(__file__).resolve().parents[1]

# ❌ REMOVE THIS (Lambda should not depend on local files)
# load_dotenv(ROOT_DIR / ".env")

# =========================
# ENV CONFIG (LAMBDA SAFE)
# =========================
MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME", "playsharp")

# =========================
# DEBUG LOGGING (SAFE)
# =========================
logger.info("========== MONGO CONFIG ==========")
logger.info(f"DB_NAME: {DB_NAME}")
logger.info(f"MONGO_URI present: {bool(MONGO_URI)}")

if not MONGO_URI:
    logger.error("❌ MONGO_URI is NOT SET in Lambda environment variables!")
    raise ValueError("MONGO_URI is missing")

# =========================
# CONNECTION
# =========================
client = MongoClient(MONGO_URI, server_api=ServerApi("1"))
db = client[DB_NAME]

leaderboard_collection = db["leaderboard"]
contacts_collection = db["contacts"]

logger.info("✅ MongoDB connection initialized successfully")


# =========================
# HELPERS
# =========================
def _convert_objectid(value: Any) -> Any:
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, dict):
        return {k: _convert_objectid(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_convert_objectid(v) for v in value]
    return value


def _normalize_game_type_field(score_data: dict) -> dict:
    normalized = score_data.copy()
    if "gameType" in normalized:
        normalized["game_type"] = normalized.pop("gameType")
    return normalized


def serialize_item(item: dict) -> dict:
    cleaned = {k: v for k, v in item.items() if k not in ("_id", "best_score_rank")}

    cleaned["id"] = str(item.get("_id", ""))

    if "game_type" in cleaned:
        cleaned["gameType"] = cleaned.pop("game_type")

    if "reaction_time" in cleaned:
        cleaned["reactionTime"] = cleaned.pop("reaction_time")

    return _convert_objectid(cleaned)


def calc_sort_key(game_type: str, score: int, reaction_time: float | None) -> float:
    if game_type == "reaction":
        return float(reaction_time if reaction_time is not None else score)
    return float(-score)


best_score_rank = calc_sort_key


# =========================
# MAIN QUERY
# =========================
def get_leaderboard(
    game_type: str,
    club: Optional[str] = None,
    period: str = "all",
    limit: int = 20,
) -> List[Dict[str, Any]]:

    logger.info(f"📊 Fetching leaderboard: game_type={game_type}, club={club}, period={period}")

    filter_query: dict = {"game_type": game_type.lower()}

    if club and club != "All":
        from services.clubs import canonical_club
        filter_query["club"] = canonical_club(club)

    if period == "weekly":
        cutoff = datetime.now(timezone.utc) - timedelta(days=7)
        filter_query["createdAt"] = {"$gte": cutoff}

    docs = list(
        leaderboard_collection.find(
            filter_query,
            {
                "_id": 1,
                "name": 1,
                "club": 1,
                "age": 1,
                "game_type": 1,
                "score": 1,
                "reactionTime": 1,
                "reaction_time": 1,
                "createdAt": 1,
            },
        )
    )

    logger.info(f"📦 Mongo returned {len(docs)} documents")

    docs.sort(
        key=lambda d: calc_sort_key(
            game_type.lower(),
            d.get("score", 0),
            d.get("reactionTime") or d.get("reaction_time"),
        )
    )

    return [serialize_item(doc) for doc in docs[:limit]]


def insert_score(score_data: dict) -> None:
    normalized = _normalize_game_type_field(score_data)
    normalized["game_type"] = normalized["game_type"].lower()

    normalized["best_score_rank"] = calc_sort_key(
        normalized["game_type"],
        normalized.get("score", 0),
        normalized.get("reactionTime"),
    )

    leaderboard_collection.insert_one(normalized)


def update_score(game_type: str, player_id: str, score_data: dict) -> bool:
    query = {"game_type": game_type.lower(), "player_id": player_id}
    existing = leaderboard_collection.find_one(query)

    normalized = _normalize_game_type_field(score_data)
    new_rank = calc_sort_key(
        game_type,
        normalized.get("score", 0),
        normalized.get("reactionTime"),
    )

    normalized["best_score_rank"] = new_rank

    if existing and existing.get("best_score_rank", float("inf")) <= new_rank:
        return False

    leaderboard_collection.update_one(query, {"$set": normalized}, upsert=True)
    return True


def check_club_exists(club: str) -> bool:
    return leaderboard_collection.count_documents({"club": club}) > 0