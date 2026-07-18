# DynamoDB Leaderboard Implementation Guide

## Overview

The `decision-game-leaderboard` DynamoDB table replaces the MongoDB `scores` collection for leaderboard operations. This provides:

- **Cheap reads:** Query by `game_type` gets top scores efficiently via GSI
- **Cheap writes:** Conditional updates only persist score improvements
- **Scalability:** On-demand billing handles traffic spikes automatically

## Architecture

### Data Flow

```
Player completes drill (game.jsx)
  ↓
submitScore(gameType, score, name, club, age)
  ↓
Backend API: POST /api/score
  ↓
Update DynamoDB leaderboard:
  - Conditional write: only if new score > best_score
  - Update best_score, best_score_rank, timestamp
  ↓
Return success/failure
  ↓
GET /api/leaderboard/{game_type}
  ↓
Query DynamoDB GameTypeScoreIndex (GSI)
  ↓
Return top 20 sorted by score
```

## Client-Side Setup (React)

Players need a persistent stable UUID. Generate it once on first play and store in browser:

### 1. Install UUID Library

```bash
cd frontend
yarn add uuid
```

### 2. Create Player ID Hook

Create `frontend/src/hooks/usePlayerId.js`:

```javascript
import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

/**
 * Hook to get or generate a stable player ID.
 * Persists to localStorage so returning player-models use the same ID.
 * Solves: name/club spelling variations, duplicate records, player tracking.
 */
export function usePlayerId() {
    const [playerId, setPlayerId] = useState(null);

    useEffect(() => {
        const PLAYER_ID_KEY = 'playsmart_player_id';
        let id = localStorage.getItem(PLAYER_ID_KEY);
        
        if (!id) {
            // First-time player: generate and persist UUID
            id = uuidv4();
            localStorage.setItem(PLAYER_ID_KEY, id);
            console.log('Generated new player ID:', id);
        }
        
        setPlayerId(id);
    }, []);

    return playerId;
}
```

### 3. Use in Game Pages

Update `frontend/src/pages/DecisionGamePage.jsx`:

```javascript
import { usePlayerId } from '@/hooks/usePlayerId';
import { submitScore } from '@/services/api';

export default function DecisionGamePage() {
    const playerId = usePlayerId();
    const [name, setName] = useState('');
    const [club, setClub] = useState('');

    const handleComplete = async (result) => {
        try {
            await submitScore({
                playerId,  // Include persistent UUID
                name: name.trim(),
                club: club.trim(),
                gameType: 'decision',
                score: result.score,
            });
            toast.success(`Score saved`);
        } catch (error) {
            toast.error('Could not save score');
        }
    };
    // ...
}
```

### 4. Update Backend Model

Update `backend/models/score.py`:

```python
class ScoreCreate(BaseModel):
    playerId: str  # Stable UUID from frontend
    name: str = Field(min_length=1, max_length=80)
    club: str
    age: Optional[int] = Field(default=None, ge=6, le=99)
    gameType: Literal["reaction", "decision", "scanning"]
    score: int = Field(ge=0, le=10000)
    reactionTime: Optional[float] = Field(default=None, ge=0, le=10000)

class Score(BaseModel):
    model_config = ConfigDict(extra="ignore")

    playerId: str  # Now part of score model
    name: str
    club: str
    age: Optional[int] = None
    gameType: str
    score: int
    reactionTime: Optional[float] = None
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
```

**Benefits:**
- ✅ Same player always has same `playerId`
- ✅ Name/club spelling variations don't create duplicates
- ✅ Returning players' scores aggregate correctly
- ✅ Better leaderboard rankings
- ✅ No name-based player tracking (privacy-friendly)

---

## Backend Implementation (Python/FastAPI)

### 1. Install Boto3

```bash
pip install boto3
```

Add to `requirements.txt`:
```
boto3>=1.28.0
```

### 2. Configure DynamoDB Client

Create or update `backend/services/dynamodb.py`:

```python
"""DynamoDB client and leaderboard operations."""

import os
import boto3
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from decimal import Decimal

# Initialize DynamoDB resource
dynamodb = boto3.resource("dynamodb", region_name=os.getenv("AWS_REGION", "eu-west-2"))
leaderboard_table = dynamodb.Table(os.getenv("LEADERBOARD_TABLE_NAME", "playsmart-decision-game-leaderboard"))


def iso_now() -> str:
    """Return current time as ISO 8601 string."""
    return datetime.now(timezone.utc).isoformat()


def calculate_rank(score: int) -> int:
    """Calculate rank value for GSI sorting (lower is better rank)."""
    # 10000 - score ensures best scores sort first (ascending)
    return 10000 - score


async def update_leaderboard_score(
    game_type: str,
    player_id: str,
    player_name: str,
    club: str,
    score: int,
    age: Optional[int] = None,
    reaction_time: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Update player's leaderboard entry only if score improved.
    
    Args:
        game_type: "decision", "scanning", or "reaction"
        player_id: Stable UUID (generated on first play, persisted client-side)
        player_name: Player display name (can change between drills)
        club: Club name (can change between drills)
        score: Score value
        age: Optional age (6-99)
        reaction_time: Optional reaction time in ms
    
    Returns:
        {"success": bool, "updated": bool, "reason": str}
    """
    try:
        timestamp = iso_now()
        rank = calculate_rank(score)
        
        update_expr_parts = [
            "player_name = :pn",
            "club = :c",
            "best_score = :ns",
            "best_score_timestamp = :ts",
            "best_score_rank = :rank",
            "last_played = :ts",
            "attempt_count = if_not_exists(attempt_count, :zero) + :inc"
        ]
        
        expr_values = {
            ":pn": player_name,
            ":c": club,
            ":ns": score,
            ":ts": timestamp,
            ":rank": Decimal(str(rank)),
            ":zero": Decimal("0"),
            ":inc": Decimal("1"),
        }
        
        # Add optional fields
        if age:
            update_expr_parts.append("age = :age")
            expr_values[":age"] = age
        
        if reaction_time is not None and game_type == "reaction":
            update_expr_parts.append("best_reaction_time = :rt")
            expr_values[":rt"] = Decimal(str(reaction_time))
        
        # Condition: only update if new score is better OR player doesn't exist
        condition_expression = "best_score < :ns OR attribute_not_exists(best_score)"
        
        leaderboard_table.update_item(
            Key={
                "game_type": game_type,
                "player_id": player_id,
            },
            UpdateExpression=f"SET {', '.join(update_expr_parts)}",
            ConditionExpression=condition_expression,
            ExpressionAttributeValues=expr_values,
        )
        
        return {
            "success": True,
            "updated": True,
            "reason": "Score recorded or improved",
        }
    
    except dynamodb.meta.client.exceptions.ConditionalCheckFailedException:
        return {
            "success": True,
            "updated": False,
            "reason": "Score not better than existing best",
        }
    
    except Exception as e:
        print(f"Error updating leaderboard: {e}")
        return {
            "success": False,
            "updated": False,
            "reason": f"Database error: {str(e)}",
        }


async def get_leaderboard(
    game_type: str,
    club: Optional[str] = None,
    limit: int = 20,
) -> List[Dict[str, Any]]:
    """
    Get leaderboard for a game type.
    
    Args:
        game_type: "decision", "scanning", or "reaction"
        club: Optional club filter
        limit: Max results (1-100)
    
    Returns:
        List of leaderboard entries sorted by score (best first)
    """
    try:
        # Query by game type (uses GSI for automatic sorting by best_score_rank)
        response = leaderboard_table.query(
            IndexName="GameTypeScoreIndex",
            KeyConditionExpression="game_type = :gt",
            ExpressionAttributeValues={":gt": game_type},
            ScanIndexForward=True,  # ASC by best_score_rank (best scores first)
            Limit=limit,
        )
        
        results = response.get("Items", [])
        
        # Filter by club if specified
        if club and club != "All":
            results = [r for r in results if r.get("club") == club]
        
        # Convert Decimal to int for JSON serialization
        for item in results:
            if "best_score" in item:
                item["best_score"] = int(item["best_score"])
            if "attempt_count" in item:
                item["attempt_count"] = int(item["attempt_count"])
            if "best_reaction_time" in item:
                item["best_reaction_time"] = float(item["best_reaction_time"])
        
        return results
    
    except Exception as e:
        print(f"Error fetching leaderboard: {e}")
        return []


async def get_player_best_score(
    game_type: str,
    player_id: str,
) -> Optional[Dict[str, Any]]:
    """Get a player's best score for a game type."""
    try:
        response = leaderboard_table.get_item(
            Key={
                "game_type": game_type,
                "player_id": player_id,
            }
        )
        
        item = response.get("Item")
        if item:
            # Convert Decimal types
            if "best_score" in item:
                item["best_score"] = int(item["best_score"])
            if "best_reaction_time" in item:
                item["best_reaction_time"] = float(item["best_reaction_time"])
        
        return item
    
    except Exception as e:
        print(f"Error fetching player score: {e}")
        return None
```

### 3. Update API Endpoint

Update `backend/routes/score.py` or `server.py`:

```python
from backend.services.dynamodb import update_leaderboard_score
from backend.models.score import ScoreCreate

@api_router.post("/score", response_model=ScoreResponse, status_code=201)
@limiter.limit("20/minute")
async def create_score(request: Request, payload: ScoreCreate):
    # Validate input
    if not payload.name.strip():
        raise HTTPException(status_code=400, detail="Player name required")
    if not payload.club.strip():
        raise HTTPException(status_code=400, detail="Club name required")
    if not payload.playerId:
        raise HTTPException(status_code=400, detail="Player ID required")
    
    # Update DynamoDB leaderboard (only if score improves)
    result = await update_leaderboard_score(
        game_type=payload.gameType,
        player_id=payload.playerId,
        player_name=payload.name.strip(),
        club=payload.club.strip(),
        score=payload.score,
        age=payload.age,
        reaction_time=payload.reactionTime,
    )
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail="Could not save score")
    
    # Log the result for metrics
    print(f"Score recorded: {payload.gameType} by {payload.name} - Updated: {result['updated']}")
    
    return ScoreResponse(
        id="temp-id",  # DynamoDB uses composite key, not separate ID
        name=payload.name,
        club=payload.club,
        gameType=payload.gameType,
        score=payload.score,
        age=payload.age,
        reactionTime=payload.reactionTime,
        createdAt=datetime.now(timezone.utc),
        isNewClub=result["updated"],  # Reuse as "first score" indicator
    )


@api_router.get("/leaderboard/{game_type}")
async def get_leaderboard(
    game_type: str,
    club: Optional[str] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
):
    if game_type not in {"decision", "scanning", "reaction"}:
        raise HTTPException(status_code=400, detail=f"Unknown game type: {game_type}")
    
    from backend.services.dynamodb import get_leaderboard
    
    results = await get_leaderboard(game_type, club=club, limit=limit)
    
    return {
        "gameType": game_type,
        "club": club or "All",
        "period": "all",
        "results": results,
    }
```

### 4. Environment Variables

Add to `.env`:

```bash
# DynamoDB
AWS_REGION=eu-west-2
LEADERBOARD_TABLE_NAME=playsmart-decision-game-leaderboard
AWS_ACCESS_KEY_ID=xxxxx
AWS_SECRET_ACCESS_KEY=xxxxx
```

For local development with AWS credentials from AWS CLI:
```bash
# AWS credentials will be read automatically from ~/.aws/credentials
```

## Migration from MongoDB

### Step 1: Export MongoDB Data

```bash
cd backend
mongoexport --db playsmart_db --collection scores --out scores_export.json
```

### Step 2: Transform and Import to DynamoDB

Create `backend/scripts/migrate_scores_to_dynamodb.py`:

```python
"""Migrate MongoDB scores to DynamoDB with stable player IDs."""

import json
import boto3
import uuid
from datetime import datetime
from decimal import Decimal

dynamodb = boto3.resource("dynamodb", region_name="eu-west-2")
table = dynamodb.Table("playsmart-decision-game-leaderboard")

def migrate():
    with open("scores_export.json") as f:
        scores = json.load(f)
    
    # Generate stable UUIDs for unique player-models (name+club combos)
    player_map = {}  # {(name, club): uuid}
    
    # Group by game_type and player, keep only best score
    grouped = {}
    
    for score in scores:
        game_type = score.get("gameType", "decision")
        player_name = score.get("name", "Unknown")
        club = score.get("club", "Unknown")
        
        # Create stable player key (case-insensitive)
        player_key = (player_name.lower(), club.lower())
        
        # Generate UUID if first time seeing this player
        if player_key not in player_map:
            player_map[player_key] = str(uuid.uuid4())
        
        player_id = player_map[player_key]
        key = (game_type, player_id)
        
        if key not in grouped or int(score.get("score", 0)) > int(grouped[key].get("score", 0)):
            grouped[key] = (score, player_name, club)
    
    # Write to DynamoDB
    with table.batch_writer(batch_size=25) as batch:
        for (game_type, player_id), (score, player_name, club) in grouped.items():
            rank = 10000 - int(score.get("score", 0))
            
            item = {
                "game_type": game_type,
                "player_id": player_id,
                "player_name": player_name,  # Use latest name
                "club": club,  # Use latest club
                "best_score": Decimal(str(score.get("score", 0))),
                "best_score_rank": Decimal(str(rank)),
                "best_score_timestamp": score.get("createdAt"),
                "age": score.get("age"),
                "attempt_count": Decimal("1"),
            }
            
            if score.get("reactionTime"):
                item["best_reaction_time"] = Decimal(str(score["reactionTime"]))
            
            batch.put_item(Item=item)
    
    print(f"Generated {len(player_map)} unique player IDs")
    print(f"Migrated {len(grouped)} leaderboard entries")
    print("\nPlayer ID mapping saved. Store this for reference:")
    with open("player_id_mapping.json", "w") as f:
        # Save mapping with display name for reference
        mapping = {
            f"{name}#{club}": player_id
            for (name, club), player_id in player_map.items()
        }
        json.dump(mapping, f, indent=2)
    print("Saved to player_id_mapping.json")

if __name__ == "__main__":
    migrate()
```

Run migration:
```bash
python scripts/migrate_scores_to_dynamodb.py
```

### Step 3: Verify Migration

```bash
# Count records in DynamoDB
aws dynamodb scan --table-name playsmart-decision-game-leaderboard --select COUNT_ITEMS --region eu-west-2

# Sample query
aws dynamodb query \
  --table-name playsmart-decision-game-leaderboard \
  --index-name GameTypeScoreIndex \
  --key-condition-expression "game_type = :gt" \
  --expression-attribute-values '{":gt":{"S":"decision"}}' \
  --limit 5 \
  --region eu-west-2
```

## Testing

### Local Testing with Moto

Install mock AWS:
```bash
pip install moto
```

Test in `backend/tests/test_dynamodb.py`:

```python
"""Test DynamoDB leaderboard operations."""

import pytest
from moto import mock_dynamodb
import boto3
from backend.services.dynamodb import update_leaderboard_score, get_leaderboard


@mock_dynamodb
def test_update_score_improvement():
    """Test that improving score updates leaderboard."""
    # Setup mock table
    dynamodb = boto3.resource("dynamodb", region_name="eu-west-2")
    # ... create table ...
    
    # First score
    result1 = update_leaderboard_score("decision", "Alice", "FC United", 75)
    assert result1["updated"] == True
    
    # Better score
    result2 = update_leaderboard_score("decision", "Alice", "FC United", 85)
    assert result2["updated"] == True
    
    # Worse score (should not update)
    result3 = update_leaderboard_score("decision", "Alice", "FC United", 80)
    assert result3["updated"] == False


@mock_dynamodb
def test_get_leaderboard_sorted():
    """Test that leaderboard returns top scores in order."""
    # ... setup and populate ...
    
    results = get_leaderboard("decision", limit=10)
    assert len(results) <= 10
    assert results[0]["best_score"] >= results[1]["best_score"]  # Descending by score
```

## Cost Estimates

**On-demand billing:**
- Read: $1.25 per 1M read units
- Write: $6.25 per 1M write units

**Example monthly cost (10,000 daily active users):**
- 20 writes/day per user (2 per drill × 10 drills) = 200,000 writes/day
- Conditional check failure rate: 70% (don't update) = 140,000 skipped writes
- Actual writes: 60,000/day × 30 = 1.8M writes/month = **$11.25**
- Leaderboard reads: 100,000/day × 30 = 3M reads/month = **$3.75**
- **Total: ~$15/month** (for on-demand, scales with traffic)

## Troubleshooting

### "ConditionalCheckFailedException"
- **Expected:** Score didn't improve. Not an error—don't update database.
- **Handle:** Return 200 OK with message "Score recorded but not better than best."

### "ValidationException: One or more parameter values were invalid"
- Check that `Decimal` types are used for numbers in DynamoDB
- Verify ISO 8601 timestamp format

### "ResourceNotFoundException: Requested resource not found"
- Ensure table exists in Terraform: `terraform apply`
- Verify `LEADERBOARD_TABLE_NAME` env var matches table name

### High read costs
- Use GSI queries (not full table scans)
- Cache leaderboard in front-end or Redis for frequent reads
- Consider on-demand provisioning limits

## Next Steps

1. **Deploy:** `cd infra/terraform && terraform apply`
2. **Implement:** Add `backend/services/dynamodb.py` and update routes
3. **Test:** Run migration script and verify data
4. **Monitor:** CloudWatch → DynamoDB metrics (reads, writes, throttling)
5. **Optimize:** Set up point-in-time backups; consider GSI provisioning if needed
