"""Startup seed — curated top-15 realistic leaderboard entries per game type."""

import random
import uuid
from datetime import datetime, timedelta, timezone
from typing import List

from services.dynamodb import leaderboard_table, best_score_rank
from core import logger


def _iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()


_SEED_REACTION = [
    ("Marcus J.",   "South London FC",  17,  218, 935),
    ("Kai S.",      "Elite Academy",    19,  226, 920),
    ("Harvey D.",   "Croydon Juniors",  16,  231, 908),
    ("Noah P.",     "South London FC",  18,  238, 897),
    ("Ethan W.",    "Elite Academy",    15,  245, 885),
    ("Leo A.",      "Croydon Juniors",  17,  253, 872),
    ("Finley G.",   "South London FC",  16,  261, 858),
    ("Oscar T.",    "Elite Academy",    18,  270, 842),
    ("Reece M.",    "Croydon Juniors",  15,  279, 826),
    ("Jamal R.",    "South London FC",  14,  288, 810),
    ("Theo C.",     "Elite Academy",    17,  298, 792),
    ("Daniel L.",   "Croydon Juniors",  19,  308, 773),
    ("Aaron K.",    "South London FC",  16,  320, 750),
    ("Liam O.",     "Elite Academy",    16,  332, 728),
    ("Tyrell B.",   "Croydon Juniors",  18,  345, 703),
]

_SEED_DECISION = [
    ("Marcus J.",   "South London FC",  17,  98),
    ("Finley G.",   "South London FC",  16,  96),
    ("Tyrell B.",   "Croydon Juniors",  18,  94),
    ("Noah P.",     "South London FC",  18,  92),
    ("Daniel L.",   "Croydon Juniors",  19,  90),
    ("Kai S.",      "Elite Academy",    19,  88),
    ("Harvey D.",   "Croydon Juniors",  16,  86),
    ("Ethan W.",    "Elite Academy",    15,  84),
    ("Leo A.",      "Croydon Juniors",  17,  82),
    ("Theo C.",     "Elite Academy",    17,  80),
    ("Oscar T.",    "Elite Academy",    18,  76),
    ("Jamal R.",    "South London FC",  14,  72),
    ("Aaron K.",    "South London FC",  16,  68),
    ("Reece M.",    "Croydon Juniors",  15,  64),
    ("Liam O.",     "Elite Academy",    16,  60),
]


async def seed_sample_data() -> None:
    """Populate the leaderboard once, on first boot."""
    response = leaderboard_table.scan(Select="COUNT", Limit=1)
    if response.get("Count", 0) > 0:
        logger.info("Skipping seed — scores already present.")
        return

    now = datetime.now(timezone.utc)
    with leaderboard_table.batch_writer() as batch:
        for name, club, age, rt, score in _SEED_REACTION:
            created = now - timedelta(days=random.randint(1, 14), hours=random.randint(0, 23))
            batch.put_item(
                Item={
                    "id": str(uuid.uuid4()),
                    "name": name,
                    "club": club,
                    "age": age,
                    "gameType": "reaction",
                    "score": score,
                    "reactionTime": float(rt),
                    "createdAt": _iso(created),
                    "game_type": "reaction",
                    "player_id": str(uuid.uuid4()),
                    "best_score_rank": best_score_rank("reaction", score, float(rt)),
                    "seeded": True,
                }
            )

        for name, club, age, score in _SEED_DECISION:
            created = now - timedelta(days=random.randint(1, 14), hours=random.randint(0, 23))
            item = {
                "id": str(uuid.uuid4()),
                "name": name,
                "club": club,
                "age": age,
                "gameType": "decision",
                "score": score,
                "createdAt": _iso(created),
                "game_type": "decision",
                "player_id": str(uuid.uuid4()),
                "best_score_rank": best_score_rank("decision", score, None),
                "seeded": True,
            }
            batch.put_item(Item=item)

    logger.info("Seeded leaderboard with curated scores.")
