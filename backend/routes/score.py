"""Game-score submission."""

import uuid
from datetime import timezone

from fastapi import APIRouter, HTTPException, Request

from core import limiter
from models import Score, ScoreCreate, ScoreResponse
from services.clubs import canonical_club
from services.mongodb import insert_score, update_score, check_club_exists, best_score_rank

router = APIRouter()


def _iso(dt):
    return dt.astimezone(timezone.utc).isoformat()


@router.post("/score", response_model=ScoreResponse, status_code=201)
@limiter.limit("20/minute")
async def create_score(request: Request, payload: ScoreCreate):
    club_canon = canonical_club(payload.club)
    if not club_canon:
        raise HTTPException(status_code=400, detail="Club name is required.")
    if len(club_canon) > 120:
        raise HTTPException(status_code=400, detail="Club name is too long.")

    data = payload.model_dump()
    data["club"] = club_canon
    score = Score(**data)
    is_new_club = not check_club_exists(club_canon)

    player_id = data.get("playerId") or str(uuid.uuid4())
    item = score.model_dump()
    item["createdAt"] = _iso(score.createdAt)
    item["game_type"] = score.gameType
    item["player_id"] = player_id
    item["best_score_rank"] = best_score_rank(score.gameType, score.score, score.reactionTime)

    if item["reactionTime"] is None:
        item.pop("reactionTime")

    if data.get("playerId"):
        # Try to update existing score
        updated = update_score(score.gameType, player_id, item)
        if not updated:
            # Score was not better, but we still return success
            pass
    else:
        # Insert new score
        insert_score(item)

    return ScoreResponse(**score.model_dump(), isNewClub=is_new_club)
