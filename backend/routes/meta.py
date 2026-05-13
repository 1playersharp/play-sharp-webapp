"""Meta endpoints: root status, club directory."""

from typing import List

from fastapi import APIRouter

from models import Club
from services.mongodb import leaderboard_collection

router = APIRouter()


@router.get("/")
async def root():
    return {"app": "PlaySharp", "motto": "Think quicker. Move smarter.", "version": "1.2.0"}


@router.get("/clubs", response_model=List[Club])
async def list_clubs():
    """Return distinct clubs that have submitted scores (used by leaderboard filter)."""
    clubs = [club for club in leaderboard_collection.distinct("club") if isinstance(club, str) and club.strip()]
    return [Club(name=n) for n in sorted(clubs)]
