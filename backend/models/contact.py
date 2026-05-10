from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from pydantic import BaseModel, EmailStr, Field


class ContactCreate(BaseModel):
    name: str
    email: EmailStr
    message: str
    club: Optional[str] = None


class Contact(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    email: EmailStr
    message: str
    club: Optional[str] = None
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
