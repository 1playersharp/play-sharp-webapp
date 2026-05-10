"""Meta endpoints: root status, club directory."""

from typing import List

from fastapi import APIRouter

from models import Club
from services.dynamodb import leaderboard_table

router = APIRouter()


@router.get("/")
async def root():
    return {"app": "PlaySharp", "motto": "Think quicker. Move smarter.", "version": "1.2.0"}


@router.get("/clubs", response_model=List[Club])
async def list_clubs():
    """Return distinct clubs that have submitted scores (used by leaderboard filter)."""
    clubs = set()
    response = leaderboard_table.scan(ProjectionExpression="club")
    for item in response.get("Items", []):
        club_name = item.get("club")
        if isinstance(club_name, str) and club_name.strip():
            clubs.add(club_name)

    while "LastEvaluatedKey" in response:
        response = leaderboard_table.scan(
            ProjectionExpression="club",
            ExclusiveStartKey=response["LastEvaluatedKey"],
        )
        for item in response.get("Items", []):
            club_name = item.get("club")
            if isinstance(club_name, str) and club_name.strip():
                clubs.add(club_name)

    return [Club(name=n) for n in sorted(clubs)]
