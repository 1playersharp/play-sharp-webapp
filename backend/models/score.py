"""Game score models."""

import uuid
from datetime import datetime, timezone
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class ScoreCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    club: str
    age: Optional[int] = Field(default=None, ge=6, le=99)
    playerId: Optional[str] = None
    gameType: Literal["reaction", "decision", "scanning"]
    score: int = Field(ge=0, le=10000)
    reactionTime: Optional[float] = Field(default=None, ge=0, le=10000)


class Score(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    club: str
    age: Optional[int] = None
    gameType: str
    score: int
    reactionTime: Optional[float] = None
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ScoreResponse(Score):
    isNewClub: bool = False
