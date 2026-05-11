"""Leaderboard — filtered by game type, optional club + period."""

from datetime import datetime, timedelta, timezone
from typing import Literal, Optional

from boto3.dynamodb.conditions import Key, Attr
from fastapi import APIRouter, HTTPException, Query

from core import GAME_TYPES
from services.clubs import canonical_club
from services.dynamodb import leaderboard_table, serialize_item

router = APIRouter()


@router.get("/leaderboard/{game_type}")
async def get_leaderboard(
    game_type: str,
    club: Optional[str] = Query(default=None),
    period: Literal["all", "weekly"] = Query(default="all"),
    limit: int = Query(default=20, ge=1, le=100),
):
    if game_type not in GAME_TYPES:
        raise HTTPException(status_code=400, detail=f"Unknown game type. Allowed: {sorted(GAME_TYPES)}")

    filter_expr = None
    if club and club != "All":
        filter_expr = Attr("club").eq(canonical_club(club))
    if period == "weekly":
        cutoff = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        period_filter = Attr("createdAt").gte(cutoff)
        filter_expr = period_filter if filter_expr is None else filter_expr & period_filter

    params = {
        "IndexName": "GameTypeScoreIndex",
        "KeyConditionExpression": Key("game_type").eq(game_type),
        "ProjectionExpression": "#id, #n, club, age, gameType, score, reactionTime, createdAt",
        "ExpressionAttributeNames": {"#id": "id", "#n": "name"},
        "ScanIndexForward": True,
        "Limit": limit,
    }
    if filter_expr is not None:
        params["FilterExpression"] = filter_expr

    response = leaderboard_table.query(**params)
    items = [serialize_item(item) for item in response.get("Items", [])]
    return {"gameType": game_type, "club": club or "All", "period": period, "results": items}
