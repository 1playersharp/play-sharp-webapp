"""Leaderboard — filtered by game type, optional club + period."""

from typing import Literal, Optional

from fastapi import APIRouter, HTTPException, Query

from core import GAME_TYPES
from services.mongodb import get_leaderboard

router = APIRouter()


@router.get("/leaderboard/{game_type}")
async def get_leaderboard_endpoint(
    game_type: str,
    club: Optional[str] = Query(default=None),
    period: Literal["all", "weekly"] = Query(default="all"),
    limit: int = Query(default=20, ge=1, le=100),
):
    if game_type not in GAME_TYPES:
        raise HTTPException(status_code=400, detail=f"Unknown game type. Allowed: {sorted(GAME_TYPES)}")

    items = get_leaderboard(
        game_type=game_type,
        club=club,
        period=period,
        limit=limit
    )

    return {"gameType": game_type, "club": club or "All", "period": period, "results": items}
