# DynamoDB Leaderboard Table Schema

## Table: `{prefix}-decision-game-leaderboard`

Optimized for cheap reads and writes with conditional updates on score improvement.

### Partition & Sort Keys

| Key | Type | Example | Purpose |
|-----|------|---------|---------|
| **game_type** (PK) | String | `"decision"` | Partition by game type (`"decision"`, `"scanning"`, `"reaction"`) |
| **player_id** (SK) | String | `"550e8400-e29b-41d4-a716-446655440000"` | Stable UUID for player (generated once, persisted client-side) |

### Attributes

**Required:**
- `game_type` (String, PK): `"decision"` \| `"scanning"` \| `"reaction"`
- `player_id` (String, SK): Stable UUID generated on first play (e.g., `550e8400-e29b-41d4-a716-446655440000`)
- `player_name` (String): Player's display name (can change between drills)
- `club` (String): Club name (can change between drills)
- `best_score` (Number): Player's best score for this game type
- `best_score_timestamp` (String): ISO 8601 timestamp of best score
- `best_score_rank` (Number): Rank position (for GSI sorting; computed as `(10000 - best_score)`)

**Optional:**
- `age` (Number): Player age (6–99)
- `best_reaction_time` (Number): For reaction game type (milliseconds)
- `attempt_count` (Number): Total attempts for this game
- `last_played` (String): ISO 8601 timestamp of last play

### Global Secondary Index: `GameTypeScoreIndex`

- **PK:** `game_type`
- **SK:** `best_score_rank` (Number)
- **Purpose:** Efficient leaderboard queries (sorted by best score, descending)
- **Query Pattern:**
  ```
  Query game_type = "decision"
  Sort by best_score_rank ASC
  Limit 20
  ```
  Returns top 20 scores naturally ordered.

---

## Write Patterns

### Pattern 1: Update Player Score (Conditional Write)

Only update if the new score is **better** than the existing best score. Uses DynamoDB conditional expression to avoid unnecessary writes.

**Pseudo-code:**
```python
def update_player_score(game_type, player_id, player_name, club, new_score, age=None):
    """Update player score (player_id should be pre-generated UUID)."""
    timestamp = iso_now()
    rank = 10000 - new_score  # For GSI ordering
    
    try:
        table.update_item(
            Key={
                "game_type": game_type,
                "player_id": player_id
            },
            UpdateExpression="""
                SET player_name = :pn,
                    club = :c,
                    best_score = :ns,
                    best_score_timestamp = :ts,
                    best_score_rank = :rank,
                    last_played = :ts
                ADD attempt_count :inc
            """,
            ConditionExpression="best_score < :ns OR attribute_not_exists(best_score)",
            ExpressionAttributeValues={
                ":pn": player_name,
                ":c": club,
                ":ns": new_score,
                ":ts": timestamp,
                ":rank": rank,
                ":inc": 1
            }
        )
        return {"updated": True, "reason": "Score improved"}
    except ConditionalCheckFailedException:
        return {"updated": False, "reason": "Score not better than best"}
```

**Cost:** 1 write unit per attempt, but only on first attempt or score improvement.

### Pattern 2: Get Leaderboard (Top 20)

**Query:**
```python
response = table.query(
    IndexName="GameTypeScoreIndex",
    KeyConditionExpression="game_type = :gt",
    ExpressionAttributeValues={":gt": "decision"},
    ScanIndexForward=True,  # ASC by best_score_rank (best scores first)
    Limit=20
)
```

**Cost:** 1 read unit per item (eventually ~20 read units for top 20).

### Pattern 3: Get Player's Best Score

**Query:**
```python
response = table.query(
    KeyConditionExpression="game_type = :gt AND player_id = :pid",
    ExpressionAttributeValues={
        ":gt": "decision",
        ":pid": player_id
    }
)
```

**Cost:** 1 read unit.

---

## Cost Optimization Tips

1. **Conditional Writes:** Only write on score improvement → fewer writes
2. **PAY_PER_REQUEST Billing:** No capacity planning needed; scales automatically
3. **Sparse Attributes:** Optional fields (age, reaction_time) only stored if relevant
4. **GSI for Leaderboard:** Avoids expensive scans; query is O(k) where k = limit
5. **Batch Operations:** Use `batch_write_item` for seeding large datasets

---

## Example Items

```json
{
  "game_type": "decision",
  "player_id": "550e8400-e29b-41d4-a716-446655440000",
  "player_name": "Marcus J.",
  "club": "South London FC",
  "best_score": 95,
  "best_score_rank": 9905,
  "best_score_timestamp": "2026-05-07T14:23:45Z",
  "age": 17,
  "attempt_count": 12,
  "last_played": "2026-05-07T14:23:45Z"
}
```

```json
{
  "game_type": "scanning",
  "player_id": "550e8400-e29b-41d4-a716-446655440001",
  "player_name": "Kai S.",
  "club": "Elite Academy",
  "best_score": 88,
  "best_score_rank": 9912,
  "best_score_timestamp": "2026-05-06T10:00:00Z",
  "age": 19,
  "attempt_count": 8,
  "last_played": "2026-05-07T09:15:30Z"
}
```

---

## Migration from MongoDB

When migrating from MongoDB to DynamoDB:

1. **Generate `player_id` for each unique player:** Use UUID (e.g., `uuid.uuid4()`)
   - Group MongoDB records by player (use name + club as grouping key)
   - Assign one UUID per unique player
   - Keep mapping for reference
2. **Compute `best_score_rank`:** `10000 - best_score`
3. **Keep latest name/club:** Use most recent name and club values
4. **Format timestamps:** Ensure ISO 8601 format
5. **Batch insert:** Use `batch_write_item` with exponential backoff
6. **Verify:** Query sample data and compare counts with MongoDB
