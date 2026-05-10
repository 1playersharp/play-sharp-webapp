"""Club-claim lead capture routes."""

from datetime import timezone
from typing import List

from fastapi import APIRouter, Query, Request

from core import limiter, logger
from models import ClubClaim, ClubClaimCreate
from services.clubs import canonical_club
from services.dynamodb import club_claims_table

router = APIRouter()


def _iso(dt):
    return dt.astimezone(timezone.utc).isoformat()


@router.post("/club-claim", response_model=ClubClaim, status_code=201)
@limiter.limit("5/minute")
async def create_club_claim(request: Request, payload: ClubClaimCreate):
    if club_claims_table is None:
        raise RuntimeError("CLUB_CLAIMS_TABLE environment variable is required")

    data = payload.model_dump()
    data["club"] = canonical_club(payload.club)
    claim = ClubClaim(**data)
    item = claim.model_dump()
    item["createdAt"] = _iso(claim.createdAt)
    club_claims_table.put_item(Item=item)
    logger.info("Club claim: %s by %s <%s>", claim.club, claim.contactName, claim.email)
    return claim


@router.get("/club-claim", response_model=List[ClubClaim])
async def list_club_claims(limit: int = Query(50, ge=1, le=500)):
    if club_claims_table is None:
        raise RuntimeError("CLUB_CLAIMS_TABLE environment variable is required")

    response = club_claims_table.scan(Limit=limit)
    items = response.get("Items", [])
    return [ClubClaim(**item) for item in items]
