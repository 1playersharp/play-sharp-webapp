import random
import uuid
from datetime import datetime, timezone

from pymongo import MongoClient
from pymongo.server_api import ServerApi

print("🔥 FILE LOADED: seed_leaderboard.py")

# -----------------------------
# MONGODB
# -----------------------------
uri = "MONGU_URI"

client = MongoClient(uri, server_api=ServerApi("1"))

db = client["DB_NAME"]  # ← replace with your DB name if needed
collection = db["leaderboard"]

# -----------------------------
# CONFIG
# -----------------------------
GAME_TYPES = ["reaction", "decision", "scanning"]

FIRST_NAMES = [
    "Alex", "Ben", "Charlie", "Daniel", "Ethan", "Finley", "George",
    "Harry", "Isaac", "Jayden", "Kofi", "Luca", "Mateo", "Noah",
    "Omar", "Piotr", "Rayan", "Samuel", "Tom", "Yusuf"
]

LAST_NAMES = [
    "Smith", "Jones", "Brown", "Taylor", "Wilson", "Davies",
    "Martin", "Dubois", "Kowalski", "Okafor", "Silva", "Garcia",
    "Hughes", "Walker", "Johnson", "Mensah", "Nowak", "Musa"
]

CLUBS = [
    "London Falcons Academy",
    "South Coast Juniors",
    "Midlands Elite Centre",
    "Northbridge Youth FC",
    "Harbour Athletic Youth",
    "Westfield Juniors",
    "Paris Football Centre",
    "Lyon Development Academy",
    "Ajax Academy",
    "Benfica Training Centre",
    "Right to Dream Academy",
    "Flamengo Youth"
]

# -----------------------------
# AGE CURVE (11–18)
# -----------------------------
def age_profile(age):
    if age <= 12:
        return {"base": 58, "variance": 14}
    elif age <= 14:
        return {"base": 65, "variance": 12}
    elif age <= 15:
        return {"base": 72, "variance": 10}
    elif age <= 16:
        return {"base": 78, "variance": 8}
    elif age <= 17:
        return {"base": 83, "variance": 7}
    else:
        return {"base": 86, "variance": 6}


def generate_age():
    return random.randint(11, 18)


def generate_name():
    return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"


def generate_club():
    return random.choice(CLUBS)


def generate_reaction_time(age):
    if age <= 12:
        val = random.uniform(0.55, 0.85)
    elif age <= 14:
        val = random.uniform(0.45, 0.75)
    elif age <= 16:
        val = random.uniform(0.35, 0.65)
    else:
        val = random.uniform(0.28, 0.55)

    return round(val, 2)


def generate_score(game_type, age):
    profile = age_profile(age)

    base = profile["base"]
    variance = profile["variance"]

    modifier = {
        "reaction": 5,
        "decision": 3,
        "scanning": 6,
    }[game_type]

    score = base + modifier + random.randint(-variance, variance)
    return max(40, min(100, score))


def best_score_rank(game_type, score, reaction_time):
    if game_type == "reaction":
        return reaction_time
    return -score


# -----------------------------
# PLAYER
# -----------------------------
def generate_player(game_type):
    age = generate_age()
    score = generate_score(game_type, age)
    reaction_time = generate_reaction_time(age)

    return {
        "game_type": game_type,
        "player_id": str(uuid.uuid4()),
        "name": generate_name(),
        "club": generate_club(),
        "age": age,
        "score": score,
        "reactionTime": reaction_time,
        "best_score_rank": best_score_rank(game_type, score, reaction_time),
        "createdAt": datetime.now(timezone.utc),
    }


# -----------------------------
# SEED
# -----------------------------
def seed():
    print("⚽ Starting seed process...")

    all_players = []

    for game in GAME_TYPES:
        print(f"➡️ Generating {game}")
        for _ in range(12):
            all_players.append(generate_player(game))

    print(f"✅ Generated {len(all_players)} players")

    try:
        print("📡 Writing to MongoDB...")

        result = collection.insert_many(all_players)

        print(f"🎉 SUCCESS: inserted {len(result.inserted_ids)} players")

    except Exception as e:
        print("❌ ERROR writing to MongoDB:")
        print(e)


if __name__ == "__main__":
    seed()