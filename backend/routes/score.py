"""Game-score submission."""

import uuid
from datetime import timezone

from boto3.dynamodb.conditions import Attr
from botocore.exceptions import ClientError
from fastapi import APIRouter, HTTPException, Request

from core import limiter
from models import Score, ScoreCreate, ScoreResponse
from services.clubs import canonical_club
from services.dynamodb import leaderboard_table, best_score_rank

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
    is_new_club = False

    club_check = leaderboard_table.scan(
        FilterExpression=Attr("club").eq(club_canon),
        ProjectionExpression="club",
        Limit=1,
    )
    if not club_check.get("Items"):
        is_new_club = True

    player_id = data.get("playerId") or str(uuid.uuid4())
    item = score.model_dump()
    item["createdAt"] = _iso(score.createdAt)
    item["game_type"] = score.gameType
    item["player_id"] = player_id
    item["best_score_rank"] = best_score_rank(score.gameType, score.score, score.reactionTime)

    if item["reactionTime"] is None:
        item.pop("reactionTime")

    if data.get("playerId"):
        update_expressions = [
            "#name = :name",
            "club = :club",
            "age = :age",
            "score = :score",
            "createdAt = :createdAt",
            "best_score_rank = :best_score_rank",
        ]
        expression_values = {
            ":name": item["name"],
            ":club": item["club"],
            ":age": item["age"],
            ":score": item["score"],
            ":createdAt": item["createdAt"],
            ":best_score_rank": item["best_score_rank"],
        }
        if "reactionTime" in item:
            update_expressions.insert(4, "reactionTime = :reactionTime")
            expression_values[":reactionTime"] = item["reactionTime"]

        try:
            leaderboard_table.update_item(
                Key={"game_type": score.gameType, "player_id": player_id},
                UpdateExpression="SET " + ", ".join(update_expressions),
                ExpressionAttributeNames={"#name": "name"},
                ExpressionAttributeValues=expression_values,
                ConditionExpression=(
                    Attr("best_score_rank").not_exists() | Attr("best_score_rank").gt(item["best_score_rank"])
                ),
            )
        except ClientError as exc:
            error_code = exc.response.get("Error", {}).get("Code")
            if error_code != "ConditionalCheckFailedException":
                raise
    else:
        leaderboard_table.put_item(Item=item)

    return ScoreResponse(**score.model_dump(), isNewClub=is_new_club)
