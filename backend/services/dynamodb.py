import os
import boto3
from decimal import Decimal
from boto3.dynamodb.conditions import Key, Attr

from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parents[1]
load_dotenv(ROOT_DIR / ".env")

LEADERBOARD_TABLE_NAME = os.environ.get("LEADERBOARD_TABLE")
CLUB_CLAIMS_TABLE_NAME = os.environ.get("CLUB_CLAIMS_TABLE")

if not LEADERBOARD_TABLE_NAME:
    raise RuntimeError("LEADERBOARD_TABLE environment variable is required")

_dynamodb = boto3.resource("dynamodb")
leaderboard_table = _dynamodb.Table(LEADERBOARD_TABLE_NAME)
club_claims_table = (
    _dynamodb.Table(CLUB_CLAIMS_TABLE_NAME)
    if CLUB_CLAIMS_TABLE_NAME
    else None
)


def _convert_decimal(value):
    if isinstance(value, Decimal):
        if value == value.to_integral_value():
            return int(value)
        return float(value)
    if isinstance(value, dict):
        return {k: _convert_decimal(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_convert_decimal(v) for v in value]
    return value


def serialize_item(item: dict) -> dict:
    return {k: _convert_decimal(v) for k, v in item.items() if k not in ("player_id", "best_score_rank")}


def best_score_rank(game_type: str, score: int, reaction_time: float | None) -> float:
    if game_type == "reaction":
        return float(reaction_time if reaction_time is not None else score)
    return float(-score)
