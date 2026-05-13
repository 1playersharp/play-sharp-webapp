# test_atlas.py
from pymongo import MongoClient
from pymongo.server_api import ServerApi
from dotenv import load_dotenv
from pathlib import Path
import os

# .env is in backend/ and test is in backend/tests/
ROOT_DIR = Path(__file__).resolve().parents[1]  # ← one level up to backend/
load_dotenv(ROOT_DIR / ".env")

uri = os.getenv("MONGO_URI")
db_name = os.getenv("DB_NAME", "playsharp")

if not uri:
    print("❌ MONGO_URI not found in .env")
    exit(1)

print(f"🔗 Connecting to: {uri[:40]}...")
print(f"📦 Database: {db_name}")

try:
    client = MongoClient(uri, server_api=ServerApi("1"), serverSelectionTimeoutMS=30000)
    client.admin.command("ping")
    print("✅ Connected to Atlas successfully!")

    db = client[db_name]
    collections = db.list_collection_names()
    print(f"📂 Collections in '{db_name}': {collections or 'none yet'}")

except Exception as e:
    print(f"❌ {e}")