"""Aggregates all API sub-routers under a single APIRouter."""

from fastapi import APIRouter

from routes import meta, contact, score, club_claim, leaderboard


api_router = APIRouter(prefix="/api")
api_router.include_router(meta.router)
api_router.include_router(contact.router)
api_router.include_router(score.router)
api_router.include_router(club_claim.router)
api_router.include_router(leaderboard.router)

__all__ = ["api_router"]
