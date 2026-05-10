# DynamoDB Leaderboard — Quick Start Guide

## TL;DR

✅ **Terraform Infrastructure Ready**
```bash
cd infra/terraform
terraform apply  # Creates leaderboard table + IAM permissions
```

✅ **Table Details**
- Name: `playsmart-decision-game-leaderboard`
- PK: `game_type` (decision, scanning, reaction)
- SK: `player_id` (stable UUID, persisted client-side)
- GSI: `GameTypeScoreIndex` (for leaderboard sorting by score)

## Implementation Checklist

### Frontend (React)

- [ ] **Install UUID library**
  ```bash
  cd frontend
  yarn add uuid
  ```

- [ ] **Create `frontend/src/hooks/usePlayerId.js`**
  ```javascript
  import { useEffect, useState } from 'react';
  import { v4 as uuidv4 } from 'uuid';
  
  export function usePlayerId() {
      const [playerId, setPlayerId] = useState(null);
      useEffect(() => {
          let id = localStorage.getItem('playsmart_player_id');
          if (!id) {
              id = uuidv4();
              localStorage.setItem('playsmart_player_id', id);
          }
          setPlayerId(id);
      }, []);
      return playerId;
  }
  ```

- [ ] **Update game pages to use `usePlayerId()`**
  ```javascript
  const playerId = usePlayerId();
  await submitScore({
      playerId,  // Include stable UUID
      name, club, gameType, score
  });
  ```

### Backend Service (Python/FastAPI)

- [ ] **Create `backend/services/dynamodb.py`**
  ```python
  import boto3
  from decimal import Decimal
  
  dynamodb = boto3.resource("dynamodb", region_name=os.getenv("AWS_REGION"))
  leaderboard_table = dynamodb.Table(os.getenv("LEADERBOARD_TABLE_NAME"))
  
  async def update_leaderboard_score(game_type, player_id, player_name, club, score, age, reaction_time):
      """Update player score only if it improved (conditional write)"""
      # See DYNAMODB_IMPLEMENTATION.md for full code
      pass
  
  async def get_leaderboard(game_type, club=None, limit=20):
      """Query leaderboard sorted by score"""
      # See DYNAMODB_IMPLEMENTATION.md for full code
      pass
  ```

- [ ] **Update Pydantic models** — Add `playerId` to `ScoreCreate` and `Score`

- [ ] **Update `backend/server.py` endpoints**
  ```python
  @api_router.post("/score")
  async def create_score(request: Request, payload: ScoreCreate):
      result = await update_leaderboard_score(
          game_type=payload.gameType,
          player_id=payload.playerId,  # Use stable UUID
          player_name=payload.name,
          club=payload.club,
          score=payload.score,
          ...
      )
      return ScoreResponse(...)
  
  @api_router.get("/leaderboard/{game_type}")
  async def get_leaderboard(game_type: str, club=None, limit=20):
      results = await get_leaderboard(game_type, club, limit)
      return {"gameType": game_type, "results": results}
  ```

- [ ] **Add `boto3` to `backend/requirements.txt`**
  ```
  boto3>=1.28.0
  ```

### Environment Setup

- [ ] **`.env` file**
  ```bash
  AWS_REGION=eu-west-2
  LEADERBOARD_TABLE_NAME=playsmart-decision-game-leaderboard
  AWS_ACCESS_KEY_ID=xxxxx
  AWS_SECRET_ACCESS_KEY=xxxxx
  ```

- [ ] **Verify AWS credentials**
  ```bash
  aws sts get-caller-identity
  ```

### Testing & Verification

- [ ] **Deploy infrastructure**
  ```bash
  terraform apply
  # Should output:
  # leaderboard_table_name = "playsmart-decision-game-leaderboard"
  # leaderboard_table_arn = "arn:aws:dynamodb:eu-west-2:xxx"
  ```

- [ ] **Test score submission**
  ```bash
  curl -X POST http://localhost:8000/api/score \
    -H "Content-Type: application/json" \
    -d '{"name":"Alice","club":"FC United","gameType":"decision","score":95}'
  ```

- [ ] **Test leaderboard query**
  ```bash
  curl http://localhost:8000/api/leaderboard/decision
  # Should return top 20 scores sorted by best_score
  ```

- [ ] **Verify in DynamoDB**
  ```bash
  aws dynamodb scan \
    --table-name playsmart-decision-game-leaderboard \
    --region eu-west-2 \
    --select COUNT_ITEMS
  ```

## Data Model Reference

### Item Structure
```json
{
  "game_type": "decision",
  "player_id": "550e8400-e29b-41d4-a716-446655440000",
  "player_name": "Alice",
  "club": "FC United",
  "best_score": 95,
  "best_score_rank": 9905,
  "best_score_timestamp": "2026-05-07T14:23:45Z",
  "age": 17,
  "attempt_count": 12,
  "last_played": "2026-05-07T14:23:45Z",
  "best_reaction_time": 245  // Only for reaction game
}
```

**Key Points:**
- `player_id`: Stable UUID (generated once, stored in browser localStorage)
- `player_name` & `club`: Can change between drills (latest values stored)
- Same player always uses same `player_id`

### Key Patterns

**Query Leaderboard (Top 20):**
```python
response = table.query(
    IndexName="GameTypeScoreIndex",
    KeyConditionExpression="game_type = :gt",
    ExpressionAttributeValues={":gt": "decision"},
    ScanIndexForward=True,  # ASC by best_score_rank
    Limit=20
)
```

**Get Player's Best Score:**
```python
response = table.get_item(
    Key={
        "game_type": "decision",
        "player_id": "alice#fc-united"
    }
)
```

**Update Score (Conditional):**
```python
table.update_item(
    Key={"game_type": "decision", "player_id": "alice#fc-united"},
    UpdateExpression="SET best_score = :ns, best_score_timestamp = :ts, ...",
    ConditionExpression="best_score < :ns OR attribute_not_exists(best_score)",
    ExpressionAttributeValues={":ns": 95, ":ts": iso_now()}
)
# Only writes if new score improves best score
```

## Cost

- **Writes:** ~100K/day → ~$0.63/month (on-demand)
- **Reads:** ~100K/day → ~$0.13/month (on-demand)
- **Total:** ~$0.76/month for typical usage

(Scales with traffic; no capacity planning needed)

## Common Issues

### "ConditionalCheckFailedException"
✅ **Expected behavior** — score didn't improve. Handle gracefully:
```python
return {"success": True, "updated": False, "reason": "Score not better"}
```

### "ResourceNotFoundException"
❌ **Check:**
- Table exists: `terraform apply` succeeded
- Table name matches `LEADERBOARD_TABLE_NAME` env var
- AWS region is correct (`eu-west-2`)

### "ValidationException: One or more parameter values"
❌ **Check:**
- Use `Decimal` type for numbers in boto3
- Timestamps are ISO 8601 format
- `best_score_rank` is a number, not string

## Documentation

- **Schema Details:** See `LEADERBOARD_SCHEMA.md`
- **Implementation Guide:** See `DYNAMODB_IMPLEMENTATION.md`
- **Full Setup:** See `README_DYNAMODB_SETUP.md`

## Next Steps

1. Run `terraform apply` to create infrastructure ✅
2. Implement `backend/services/dynamodb.py` (copy from DYNAMODB_IMPLEMENTATION.md)
3. Update API endpoints to use DynamoDB
4. Test locally with mock data
5. Deploy backend Lambda function
6. Migrate data from MongoDB (see DYNAMODB_IMPLEMENTATION.md)
7. Monitor CloudWatch metrics for reads/writes

---

**Version:** 2026-05-07
**Author:** AI Assistant
**Status:** Ready for implementation
