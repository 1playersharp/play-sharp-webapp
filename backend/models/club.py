"""Club directory + club-claim lead capture models."""

import uuid
from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class Club(BaseModel):
    name: str


class ClubClaimCreate(BaseModel):
    club: str = Field(min_length=1, max_length=120)
    contactName: str = Field(min_length=1, max_length=120)
    email: EmailStr
    role: str = Field(min_length=1, max_length=60)
    squadSize: Optional[int] = Field(default=None, ge=1, le=2000)
    message: Optional[str] = Field(default=None, max_length=2000)


class ClubClaim(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    club: str
    contactName: str
    email: str
    role: str
    squadSize: Optional[int] = None
    message: Optional[str] = None
    status: str = "new"
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
