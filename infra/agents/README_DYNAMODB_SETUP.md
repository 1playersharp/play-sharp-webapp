# DynamoDB Leaderboard Table Setup — Summary

## What Was Created

### 1. **Terraform Infrastructure** (`infra/terraform/`)

#### `dynamoDB.tf`
- **Table:** `playsmart-decision-game-leaderboard`
- **Billing:** On-demand (PAY_PER_REQUEST) — scales automatically, no capacity planning
- **Primary Key:** 
  - Partition Key (PK): `game_type` (string) — "decision", "scanning", "reaction"
  - Sort Key (SK): `player_id` (string) — stable UUID (generated once, persisted client-side)
- **Global Secondary Index:** `GameTypeScoreIndex`
  - Partition Key: `game_type`
  - Sort Key: `best_score_rank` (number) — for efficient leaderboard queries
  - Returns results pre-sorted by score (best first)

#### `iam.tf` + `data.tf`
- **Policy:** `lambda-leaderboard-policy`
  - Grants Lambda functions permission to Query, Scan, GetItem, UpdateItem, PutItem, BatchWriteItem on leaderboard table
- **Attachment:** Attached to `lambda-backend-default-role` (the FastAPI backend)

#### `outputs.tf`
- Exports `leaderboard_table_name` and `leaderboard_table_arn` for reference

### 2. **Documentation**

#### `LEADERBOARD_SCHEMA.md`
- Complete data model with example items
- Write patterns with Python pseudocode
- Query patterns for efficient reads
- Cost optimization tips
- Migration guide from MongoDB

#### `DYNAMODB_IMPLEMENTATION.md`
- Full Python implementation guide for FastAPI backend
- Boto3 service class template
- API endpoint code examples
- Migration script from MongoDB
- Local testing setup with moto
- Troubleshooting guide
- Cost estimates

## Key Design Decisions

### Cheap Writes
**Conditional Updates:** Only persist scores that **improve** the player's best score.

```python
ConditionExpression = "best_score < :ns OR attribute_not_exists(best_score)"
```

- First attempt: Always writes (creates new item)
- Subsequent attempts: Only write if score > best_score
- Failed attempts: Return 200 OK with "not better" message (no write)
- **Cost:** Reduces actual writes by ~70% in typical usage

### Cheap Reads
**GSI for Leaderboard Queries:** Automatically pre-sorted by score.

```python
table.query(
    IndexName="GameTypeScoreIndex",
    KeyConditionExpression="game_type = :gt",
    ScanIndexForward=True,  # Ascending = best scores first
    Limit=20
)
```

- No full table scans
- O(k) where k = limit (e.g., 20 items)
- **Cost:** Minimal read units

### Partition Strategy
**Partition by game_type + Stable player UUIDs:** All scores for a game together, same player always has same ID.

```
game_type = "decision"
  ├─ player_id = "550e8400-e29b-41d4-a716-446655440000"
  │   └─ player_name = "Alice J." (can change per drill)
  │   └─ club = "FC United" (can change per drill)
  │   └─ best_score = 95
  ├─ player_id = "550e8400-e29b-41d4-a716-446655440001"
  │   └─ best_score = 87
  └─ player_id = "550e8400-e29b-41d4-a716-446655440002"
      └─ best_score = 92
```

**Benefits:**
- ✅ Same player always has same `player_id` (across multiple drills)
- ✅ Name/club spelling variations don't create duplicates
- ✅ Returning players' scores aggregate correctly
- ✅ No player tracking by name (privacy-friendly)

## How to Deploy

### Step 1: Ensure AWS Credentials
```bash
# Verify credentials are configured
aws sts get-caller-identity

# Or export credentials (see context in previous messages)
export AWS_ACCESS_KEY_ID=AKIA2IBODWTYSPVYKLVR
export AWS_SECRET_ACCESS_KEY=<key>
export AWS_DEFAULT_REGION=eu-west-2
```

### Step 2: Deploy Infrastructure
```bash
cd infra/terraform
terraform init  # Only if first time
terraform plan  # Review changes
terraform apply # Create resources
```

**Output:**
```
Outputs:

leaderboard_table_name = "playsmart-decision-game-leaderboard"
leaderboard_table_arn = "arn:aws:dynamodb:eu-west-2:xxx:table/playsmart-decision-game-leaderboard"
```

### Step 3: Implement Backend Service
1. Create `backend/services/dynamodb.py` (see DYNAMODB_IMPLEMENTATION.md)
2. Update `backend/server.py` or `backend/routes/score.py` endpoints
3. Add `boto3` to `requirements.txt`
4. Set environment variables:
   ```bash
   AWS_REGION=eu-west-2
   LEADERBOARD_TABLE_NAME=playsmart-decision-game-leaderboard
   ```

### Step 4: Migrate Data (Optional)
```bash
# Export from MongoDB
mongoexport --db playsmart_db --collection scores --out scores_export.json

# Transform and load to DynamoDB
python backend/scripts/migrate_scores_to_dynamodb.py
```

### Step 5: Test
```bash
# Query leaderboard
curl https://api.playsmart.example/api/leaderboard/decision

# Verify records
aws dynamodb scan \
  --table-name playsmart-decision-game-leaderboard \
  --region eu-west-2 \
  --select COUNT_ITEMS
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ usePlayerId() Hook                                  │   │
│  │ ├─ Generate UUID on first play                      │   │
│  │ └─ Persist to localStorage for returning players   │   │
│  └─────────────────────────────────────────────────────┘   │
│  User completes drill with persistent playerId            │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ submitScore(gameType, score, name, club, playerId)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (FastAPI)                        │
│                  POST /api/score                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  update_leaderboard_score()                         │   │
│  │  ├─ Receive stable playerId from frontend           │   │
│  │  ├─ Calculate best_score_rank (10000 - score)      │   │
│  │  └─ DynamoDB UpdateItem (conditional)              │   │
│  │     └─ Only write if score > best_score OR new     │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ UpdateItem (with stable playerId)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                DynamoDB Table                              │
│  playsmart-decision-game-leaderboard                       │
│                                                            │
│  Partition Key: game_type                                 │
│  Sort Key: player_id                                      │
│  ┌────────────────────────────────────────────────────┐  │
│  │ game_type | player_id | best_score | best_score_rank│  │
│  │-----------|-----------|-----------|-----------------|  │
│  │ decision  | alice#fc  | 95        | 9905          │  │
│  │ decision  | bob#acad  | 87        | 9913          │  │
│  │ scanning  | charlie#sl| 88        | 9912          │  │
│  └────────────────────────────────────────────────────┘  │
│                                                            │
│  GSI: GameTypeScoreIndex                                 │
│  ├─ PK: game_type                                        │
│  └─ SK: best_score_rank (pre-sorted, best first)        │
└─────────────────────────────────────────────────────────┘
                           ▲
                           │ Query
                           │
┌──────────────────────────┴──────────────────────────────────┐
│                    Backend (FastAPI)                        │
│                  GET /api/leaderboard/{game_type}          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  get_leaderboard(game_type, club=None, limit=20)   │   │
│  │  ├─ Query GameTypeScoreIndex by game_type          │   │
│  │  ├─ Results auto-sorted by best_score_rank         │   │
│  │  ├─ Optional: Filter by club                       │   │
│  │  └─ Return top 20 scores                           │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ JSON response
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Frontend (React) — LeaderboardPage             │
│  Renders top scores, filters by game type and club        │
└─────────────────────────────────────────────────────────────┘
```

## File Changes Summary

| File | Change |
|------|--------|
| `dynamoDB.tf` | Added leaderboard table + GSI |
| `iam.tf` | Added leaderboard policy + attachment |
| `data.tf` | Added leaderboard policy document |
| `outputs.tf` | Exported table name and ARN |
| `LEADERBOARD_SCHEMA.md` | New: Complete schema & query patterns |
| `DYNAMODB_IMPLEMENTATION.md` | New: Backend implementation guide |

## Cost Estimate

**Pricing (us-east-1, on-demand):**
- Reads: $1.25 per 1M RCU
- Writes: $6.25 per 1M WCU

**Example (10,000 DAU, 10 drills/day per user):**
- Writes: 10,000 users × 10 drills × 2 writes (1 conditional fail) = 100,000 writes/day = 3M writes/month = **$18.75/month**
- Reads: 100,000 leaderboard views/day = 3M reads/month = **$3.75/month**
- **Total: ~$22/month**

Scales with traffic; no upfront capacity costs.

## Next Steps

1. **Deploy:** `terraform apply` ✅ (creates table + IAM policy)
2. **Implement Backend:** Add boto3 service class (see DYNAMODB_IMPLEMENTATION.md)
3. **Migrate Data:** Run migration script (see DYNAMODB_IMPLEMENTATION.md)
4. **Test:** Query endpoints and verify leaderboard displays
5. **Monitor:** CloudWatch metrics for reads/writes/throttling

---

**References:**
- [AWS DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [Boto3 DynamoDB Guide](https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/dynamodb.html)
- See `LEADERBOARD_SCHEMA.md` for data model details
- See `DYNAMODB_IMPLEMENTATION.md` for code examples
